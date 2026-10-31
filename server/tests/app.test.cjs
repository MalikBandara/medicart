const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { openDatabase, settings } = require("../database.cjs");
const { createApp } = require("../app.cjs");
const { hashPassword } = require("../auth.cjs");
const {
  patientSchema,
  doctorSchema,
  appointmentIssue,
  centerNow,
} = require("../domain.cjs");
let db, app, agent;
const patient = {
  name: "Test Patient",
  dob: "1994-06-12",
  gender: "Female",
  phone: "+94 77 123 4567",
  email: "test@example.com",
  address: "Fictional test address",
  notes: "",
};
const doctor = {
  name: "Test Doctor",
  specialty: "General Medicine",
  phone: "+94 71 123 4567",
  email: "doctor@example.com",
  fee: 2500,
  availability: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  startTime: "08:00",
  endTime: "18:00",
  status: "Active",
};
const future = () => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
};
beforeEach(async () => {
  db = openDatabase(":memory:");
  app = createApp(db);
  agent = request.agent(app);
  db.prepare("INSERT INTO staff VALUES (?,?,?)").run(
    "staff-test",
    "staff@example.com",
    hashPassword("Test-password-only-123"),
  );
  const center = settings(db);
  center.openDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  db.prepare("UPDATE settings SET value=? WHERE id=1").run(
    JSON.stringify(center),
  );
  await agent
    .post("/api/login")
    .send({ email: "staff@example.com", password: "Test-password-only-123" })
    .expect(200);
});
afterEach(() => db.close());
async function fixtures() {
  const p = (await agent.post("/api/patients").send(patient).expect(201)).body;
  const d = (await agent.post("/api/doctors").send(doctor).expect(201)).body;
  return {
    p,
    d,
    a: {
      patientId: p.id,
      doctorId: d.id,
      date: future(),
      time: "10:00",
      reason: "Test consultation",
      status: "Scheduled",
    },
  };
}
test("all data endpoints require a staff session", async () => {
  for (const path of [
    "/api/bootstrap",
    "/api/patients",
    "/api/doctors",
    "/api/appointments",
    "/api/settings",
  ])
    await request(app).get(path).expect(401);
});
test("login creates an HttpOnly session; invalid credentials fail; logout revokes access", async () => {
  await request(app)
    .post("/api/login")
    .send({ email: "staff@example.com", password: "incorrect" })
    .expect(401);
  const login = await agent
    .post("/api/login")
    .send({ email: "staff@example.com", password: "Test-password-only-123" })
    .expect(200);
  assert.match(login.headers["set-cookie"][0], /HttpOnly; SameSite=Strict/);
  await agent.post("/api/logout").expect(200);
  await agent.get("/api/bootstrap").expect(401);
});
test("expired sessions are rejected", async () => {
  db.prepare("UPDATE sessions SET expires=0").run();
  await agent.get("/api/bootstrap").expect(401);
});
test("cross-origin writes are rejected", async () => {
  await agent
    .post("/api/patients")
    .set("Origin", "https://untrusted.example")
    .send(patient)
    .expect(403);
});
test("patient validation rejects missing name, malformed contact and impossible birth dates", async () => {
  for (const change of [
    { name: "" },
    { email: "wrong" },
    { phone: "123" },
    { dob: "2024-02-31" },
    { dob: "2999-01-01" },
  ])
    await agent
      .post("/api/patients")
      .send({ ...patient, ...change })
      .expect(400);
  assert.equal(
    patientSchema.safeParse({ ...patient, notes: undefined }).success,
    true,
  );
});
test("doctor validation rejects negative fees and reversed availability", async () => {
  assert.equal(doctorSchema.safeParse({ ...doctor, fee: -1 }).success, false);
  assert.equal(
    doctorSchema.safeParse({ ...doctor, startTime: "18:00", endTime: "08:00" })
      .success,
    false,
  );
  assert.equal(
    doctorSchema.safeParse({ ...doctor, availability: [] }).success,
    false,
  );
});
test("patient create, read, update, search source data and archive persist", async () => {
  const { body: p } = await agent
    .post("/api/patients")
    .send(patient)
    .expect(201);
  await agent
    .put("/api/patients/" + p.id)
    .send({ ...patient, name: "Updated Patient" })
    .expect(200);
  const get = await agent.get("/api/patients/" + p.id).expect(200);
  assert.equal(get.body.name, "Updated Patient");
  await agent.delete("/api/patients/" + p.id).expect(200);
  const archived = await agent.get("/api/patients/" + p.id).expect(200);
  assert.equal(archived.body.archived, 1);
  await agent
    .put("/api/patients/" + p.id)
    .send(patient)
    .expect(409);
});
test("doctor CRUD saves parsed availability and inactive status", async () => {
  const { body: d } = await agent.post("/api/doctors").send(doctor).expect(201);
  assert.deepEqual(d.availability, doctor.availability);
  await agent
    .put("/api/doctors/" + d.id)
    .send({ ...doctor, status: "Inactive" })
    .expect(200);
  const r = await agent.get("/api/doctors/" + d.id).expect(200);
  assert.equal(r.body.status, "Inactive");
  await agent.delete("/api/doctors/" + d.id).expect(200);
});
test("appointments require existing relationships and active doctors", async () => {
  const { a, d } = await fixtures();
  await agent
    .post("/api/appointments")
    .send({ ...a, patientId: "missing" })
    .expect(400);
  await agent
    .post("/api/appointments")
    .send({ ...a, doctorId: "missing" })
    .expect(400);
  await agent
    .put("/api/doctors/" + d.id)
    .send({ ...doctor, status: "Inactive" })
    .expect(200);
  await agent.post("/api/appointments").send(a).expect(409);
});
test("past appointments and future completed appointments are rejected", async () => {
  const { a } = await fixtures();
  await agent
    .post("/api/appointments")
    .send({ ...a, date: "2000-01-01" })
    .expect(409);
  await agent
    .post("/api/appointments")
    .send({ ...a, status: "Completed" })
    .expect(409);
});
test("overlapping appointments are rejected, adjacent half-hour slots accepted", async () => {
  const { a } = await fixtures();
  await agent.post("/api/appointments").send(a).expect(201);
  await agent.post("/api/appointments").send(a).expect(409);
  await agent
    .post("/api/appointments")
    .send({ ...a, time: "10:15" })
    .expect(409);
  await agent
    .post("/api/appointments")
    .send({ ...a, time: "09:45" })
    .expect(409);
  await agent
    .post("/api/appointments")
    .send({ ...a, time: "10:30" })
    .expect(201);
});
test("conflicts are scoped to doctor and date; rescheduling checks conflicts", async () => {
  const { a } = await fixtures();
  const first = (await agent.post("/api/appointments").send(a).expect(201))
    .body;
  const second = (
    await agent
      .post("/api/appointments")
      .send({ ...a, time: "11:00" })
      .expect(201)
  ).body;
  await agent
    .put("/api/appointments/" + second.id)
    .send({ ...a, time: "10:15" })
    .expect(409);
  await agent
    .put("/api/appointments/" + first.id)
    .send({ ...a, status: "Confirmed" })
    .expect(200);
  const d = (
    await agent
      .post("/api/doctors")
      .send({ ...doctor, email: "second@example.com" })
      .expect(201)
  ).body;
  await agent
    .post("/api/appointments")
    .send({ ...a, doctorId: d.id })
    .expect(201);
});
test("doctor and center opening hours must accommodate the full 30-minute visit", async () => {
  const { a } = await fixtures();
  await agent
    .post("/api/appointments")
    .send({ ...a, time: "07:30" })
    .expect(409);
  await agent
    .post("/api/appointments")
    .send({ ...a, time: "17:45" })
    .expect(409);
  await agent
    .post("/api/appointments")
    .send({ ...a, time: "17:30" })
    .expect(201);
});
test("doctor unavailable weekdays are rejected", async () => {
  const { a, d } = await fixtures();
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(a.date + "T12:00:00Z"));
  await agent
    .put("/api/doctors/" + d.id)
    .send({
      ...doctor,
      availability: doctor.availability.filter((v) => v !== day),
    })
    .expect(200);
  await agent.post("/api/appointments").send(a).expect(409);
});
test("archiving preserves joins and appointments; prevents new visits", async () => {
  const { a, p, d } = await fixtures();
  const visit = (await agent.post("/api/appointments").send(a).expect(201))
    .body;
  await agent.delete("/api/patients/" + p.id).expect(200);
  await agent.delete("/api/doctors/" + d.id).expect(200);
  await agent.get("/api/appointments/" + visit.id).expect(200);
  const data = (await agent.get("/api/bootstrap").expect(200)).body;
  assert.equal(data.patients[0].name, patient.name);
  assert.equal(data.doctors[0].name, doctor.name);
  await agent
    .post("/api/appointments")
    .send({ ...a, time: "12:00" })
    .expect(409);
  await agent
    .put("/api/appointments/" + visit.id)
    .send({ ...a, status: "Cancelled" })
    .expect(200);
  assert.throws(() => db.prepare("DELETE FROM patients WHERE id=?").run(p.id));
});
test("cancellation frees slots; deletion requires explicit cancellation", async () => {
  const { a } = await fixtures();
  const visit = (await agent.post("/api/appointments").send(a).expect(201))
    .body;
  await agent.delete("/api/appointments/" + visit.id).expect(409);
  await agent
    .put("/api/appointments/" + visit.id)
    .send({ ...a, status: "Cancelled" })
    .expect(200);
  await agent.post("/api/appointments").send(a).expect(201);
  await agent.delete("/api/appointments/" + visit.id).expect(200);
  await agent.get("/api/appointments/" + visit.id).expect(404);
});
test("medical center settings persist and validate timezone", async () => {
  const center = {
    ...settings(db),
    name: "New Center",
    timezone: "Asia/Singapore",
  };
  await agent.put("/api/settings").send(center).expect(200);
  const r = await agent.get("/api/bootstrap").expect(200);
  assert.equal(r.body.settings.name, "New Center");
  assert.equal(r.body.settings.timezone, "Asia/Singapore");
  await agent
    .put("/api/settings")
    .send({ ...center, timezone: "Invalid/Timezone" })
    .expect(400);
});
test("wall-clock date comparisons respect the explicitly configured timezone", () => {
  assert.equal(
    centerNow("Asia/Colombo", new Date("2026-10-31T19:00:00Z")),
    "2026-11-01T00:30",
  );
  const a = {
    date: "2026-11-01",
    time: "00:15",
    status: "Scheduled",
    doctorId: "D",
  };
  const issue = appointmentIssue(
    a,
    null,
    doctor,
    { ...settings(db), timezone: "Asia/Colombo" },
    [],
    new Date("2026-10-31T19:00:00Z"),
  );
  assert.match(issue, /future/);
});
test("unexpected server errors do not reveal database or sensitive data", async () => {
  const response = await agent.post("/api/patients").send({}).expect(400);
  assert.ok(response.body.error);
  assert.ok(response.body.fields);
  assert.equal(response.body.stack, undefined);
});
test("SQLite independently prevents overlapping writes", async () => {
  const { a } = await fixtures();
  await agent.post("/api/appointments").send(a).expect(201);
  assert.throws(
    () =>
      db
        .prepare("INSERT INTO appointments VALUES (?,?,?,?,?,?,?,?)")
        .run(
          "direct-overlap",
          a.patientId,
          a.doctorId,
          a.date,
          "10:10",
          a.reason,
          "Scheduled",
          new Date().toISOString(),
        ),
    /appointment_conflict/,
  );
});
test("malformed JSON returns a safe consistent error", async () => {
  const response = await agent
    .post("/api/patients")
    .set("Content-Type", "application/json")
    .send('{"private":"broken')
    .expect(400);
  assert.equal(response.body.error, "Request body must contain valid JSON.");
});
