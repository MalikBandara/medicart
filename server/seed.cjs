const { openDatabase, rows, settings } = require("./database.cjs");
const { hashPassword } = require("./auth.cjs");
const { centerNow } = require("./domain.cjs");
const { randomUUID } = require("node:crypto");
const db = openDatabase();
const email = process.env.STAFF_EMAIL?.toLowerCase();
const password = process.env.STAFF_PASSWORD;
if (
  !email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  !password ||
  password.length < 12
) {
  console.error(
    "Set STAFF_EMAIL and STAFF_PASSWORD (at least 12 characters) in .env before seeding.",
  );
  db.close();
  process.exit(1);
}
db.exec("BEGIN");
try {
  db.prepare(
    "INSERT INTO staff VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash",
  ).run(randomUUID(), email, hashPassword(password));
  db.prepare(
    "DELETE FROM sessions WHERE staff_id=(SELECT id FROM staff WHERE email=?)",
  ).run(email);
  // Stable IDs make repeating this command safe; existing records are never reset.
  const names = [
    "Olivia Bennett",
    "James Wilson",
    "Sophia Chen",
    "Liam Anderson",
    "Emma Thompson",
    "Noah Williams",
    "Isabella Davis",
    "Ethan Parker",
    "Amelia Foster",
    "Lucas Martin",
    "Mia Robinson",
    "Oliver Taylor",
  ];
  const today = centerNow(settings(db).timezone).slice(0, 10);
  names.forEach((name, i) =>
    db
      .prepare("INSERT OR IGNORE INTO patients VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(
        `PAT-${String(i + 1).padStart(4, "0")}`,
        name,
        `${1980 + i * 2}-0${(i % 9) + 1}-15`,
        i % 2 ? "Male" : "Female",
        `+94 77 100 ${String(i + 1000)}`,
        `${name.toLowerCase().replace(" ", ".")}@example.com`,
        `${i + 10} Garden Lane, Colombo`,
        i % 3 === 0 ? "Prefers morning appointments." : "",
        0,
        new Date(Date.now() - i * 86400000).toISOString(),
      ),
  );
  const doctors = [
    ["Amelia Richardson", "General Medicine", "AR"],
    ["Daniel Mitchell", "Cardiology", "DM"],
    ["Sarah Williams", "Pediatrics", "SW"],
    ["Michael Chen", "Dermatology", "MC"],
    ["Emily Carter", "Neurology", "EC"],
  ];
  doctors.forEach(([name, specialty], i) =>
    db
      .prepare("INSERT OR IGNORE INTO doctors VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(
        `DOC-${String(i + 1).padStart(4, "0")}`,
        name,
        specialty,
        `+94 71 200 ${i + 1000}`,
        `${name.toLowerCase().replace(" ", ".")}@example.com`,
        2500 + i * 500,
        JSON.stringify(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]),
        "08:00",
        "18:00",
        "Active",
        0,
        new Date().toISOString(),
      ),
  );
  for (let i = 0; i < 28; i++) {
    const visitId = `APT-${String(i + 1).padStart(4, "0")}`;
    if (db.prepare("SELECT id FROM appointments WHERE id=?").get(visitId))
      continue;
    const d = new Date(today + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + (i < 8 ? 0 : i < 18 ? -(i - 7) : i - 17));
    if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + (i >= 18 ? 1 : -1));
    const date = d.toISOString().slice(0, 10);
    const time = `${String(9 + (i % 8)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
    const past = date + "T" + time < centerNow(settings(db).timezone);
    const doctorId = `DOC-${String((i % doctors.length) + 1).padStart(4, "0")}`;
    const occupied = db
      .prepare(
        "SELECT id FROM appointments WHERE doctorId=? AND date=? AND status != 'Cancelled' AND ABS((CAST(substr(time,1,2) AS INTEGER)*60+CAST(substr(time,4,2) AS INTEGER))-(CAST(substr(?,1,2) AS INTEGER)*60+CAST(substr(?,4,2) AS INTEGER)))<30",
      )
      .get(doctorId, date, time, time);
    if (occupied) continue;
    db.prepare(
      "INSERT OR IGNORE INTO appointments VALUES (?,?,?,?,?,?,?,?)",
    ).run(
      visitId,
      `PAT-${String((i % names.length) + 1).padStart(4, "0")}`,
      doctorId,
      date,
      time,
      [
        "General consultation",
        "Routine checkup",
        "Follow-up visit",
        "Health screening",
      ][i % 4],
      past ? "Completed" : i % 3 === 0 ? "Scheduled" : "Confirmed",
      new Date().toISOString(),
    );
  }
  db.exec("COMMIT");
  console.log(
    `Database initialized with ${rows(db, "patients").length} fictional patients. Staff login is configured from your environment.`,
  );
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}
