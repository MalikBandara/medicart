const express = require("express");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { randomBytes, randomUUID } = require("node:crypto");
const path = require("node:path");
const { z } = require("zod");
const { rows, settings } = require("./database.cjs");
const {
  patientSchema,
  doctorSchema,
  appointmentSchema,
  settingsSchema,
  centerNow,
  appointmentIssue,
} = require("./domain.cjs");
const { verifyPassword, hashToken } = require("./auth.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
function createApp(db) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:"],
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (req, _res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== `${req.protocol}://${req.get("host")}`
    )
      return next(fail(403, "Request origin is not allowed."));
    next();
  });
  const cookie = (token, age) =>
    `medicart_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${process.env.COOKIE_SECURE === "true" ? "; Secure" : ""}`;
  app.post(
    "/api/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 15,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many login attempts. Try again in 15 minutes." },
    }),
    (req, res) => {
      const credentials = z
        .object({ email: z.email(), password: z.string().min(1).max(256) })
        .parse(req.body);
      const user = db
        .prepare("SELECT * FROM staff WHERE email=?")
        .get(credentials.email.toLowerCase());
      if (!user || !verifyPassword(credentials.password, user.password_hash))
        throw fail(401, "Email or password is incorrect.");
      const token = randomBytes(32).toString("hex");
      db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
      db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
        hashToken(token),
        user.id,
        Date.now() + 8 * 60 * 60 * 1000,
      );
      res.setHeader("Set-Cookie", cookie(token, 28800));
      res.json({ email: user.email });
    },
  );
  app.use("/api", (req, _res, next) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("medicart_session="))
      ?.slice(17);
    const session =
      token &&
      db
        .prepare(
          "SELECT staff.email FROM sessions JOIN staff ON staff.id=sessions.staff_id WHERE token_hash=? AND expires > ?",
        )
        .get(hashToken(token), Date.now());
    if (!session) return next(fail(401, "Please sign in to continue."));
    req.staff = session;
    req.sessionHash = hashToken(token);
    next();
  });
  app.get("/api/me", (req, res) => res.json(req.staff));
  app.post("/api/logout", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(req.sessionHash);
    res.setHeader("Set-Cookie", cookie("", 0));
    res.json({ ok: true });
  });
  app.get("/api/bootstrap", (_req, res) =>
    res.json({
      patients: rows(db, "patients"),
      doctors: rows(db, "doctors"),
      appointments: rows(db, "appointments"),
      settings: settings(db),
    }),
  );
  app.put("/api/settings", (req, res) => {
    const value = settingsSchema.parse(req.body);
    db.prepare("UPDATE settings SET value=? WHERE id=1").run(
      JSON.stringify(value),
    );
    res.json(value);
  });
  for (const [table, schema, prefix] of [
    ["patients", patientSchema, "PAT"],
    ["doctors", doctorSchema, "DOC"],
    ["appointments", appointmentSchema, "APT"],
  ]) {
    app.get(`/api/${table}`, (_req, res) => res.json(rows(db, table)));
    app.get(`/api/${table}/:id`, (req, res) => {
      const row = rows(db, table).find((r) => r.id === req.params.id);
      if (!row) throw fail(404, "Record not found.");
      res.json(row);
    });
    function save(req, res, updating) {
      const previous =
        updating && rows(db, table).find((r) => r.id === req.params.id);
      if (updating && !previous) throw fail(404, "Record not found.");
      if (previous?.archived)
        throw fail(409, "Archived records cannot be changed.");
      const data = schema.parse(req.body);
      if (
        table === "patients" &&
        data.dob > centerNow(settings(db).timezone).slice(0, 10)
      )
        throw fail(400, "Date of birth cannot be in the future.");
      if (table === "appointments") {
        const patient = db
          .prepare("SELECT * FROM patients WHERE id=?")
          .get(data.patientId);
        const doctor = rows(db, "doctors").find((d) => d.id === data.doctorId);
        if (!patient || !doctor)
          throw fail(400, "Select an existing patient and doctor.");
        const changingRelationship =
          !previous ||
          data.patientId !== previous.patientId ||
          data.doctorId !== previous.doctorId ||
          data.date !== previous.date ||
          data.time !== previous.time ||
          (previous.status === "Cancelled" && data.status !== "Cancelled");
        if (
          changingRelationship &&
          (patient.archived || doctor.archived || doctor.status !== "Active")
        )
          throw fail(409, "Choose an active patient and doctor.");
        const issue = appointmentIssue(
          data,
          previous,
          doctor,
          settings(db),
          rows(db, table),
        );
        if (issue) throw fail(409, issue);
      }
      const stored = {
        ...data,
        ...(table === "doctors"
          ? { availability: JSON.stringify(data.availability) }
          : {}),
      };
      const keys = Object.keys(stored);
      const id =
        previous?.id || `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
      if (updating)
        db.prepare(
          `UPDATE ${table} SET ${keys.map((k) => `${k}=?`).join(",")} WHERE id=?`,
        ).run(...Object.values(stored), id);
      else
        db.prepare(
          `INSERT INTO ${table} (id,${keys.join(",")},createdAt) VALUES (${keys.map(() => "?").join(",")},?,?)`,
        ).run(id, ...Object.values(stored), new Date().toISOString());
      res
        .status(updating ? 200 : 201)
        .json(rows(db, table).find((r) => r.id === id));
    }
    app.post(`/api/${table}`, (req, res) => save(req, res, false));
    app.put(`/api/${table}/:id`, (req, res) => save(req, res, true));
    app.delete(`/api/${table}/:id`, (req, res) => {
      const row = db
        .prepare(`SELECT * FROM ${table} WHERE id=?`)
        .get(req.params.id);
      if (!row) throw fail(404, "Record not found.");
      if (table === "appointments") {
        if (row.status !== "Cancelled")
          throw fail(
            409,
            "Cancel the appointment before permanently deleting it.",
          );
        db.prepare("DELETE FROM appointments WHERE id=?").run(row.id);
        res.json({ deleted: true });
      } else {
        db.prepare(`UPDATE ${table} SET archived=1 WHERE id=?`).run(row.id);
        res.json({ archived: true });
      }
    });
  }
  app.use("/api", (_req, _res, next) =>
    next(fail(404, "API endpoint not found.")),
  );
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
  app.use((err, _req, res, _next) => {
    if (err.type === "entity.parse.failed")
      return res
        .status(400)
        .json({ error: "Request body must contain valid JSON." });
    if (err.message === "appointment_conflict")
      return res
        .status(409)
        .json({
          error:
            "This doctor already has an overlapping appointment. Choose another time.",
        });
    if (err instanceof z.ZodError)
      return res.status(400).json({
        error: err.issues[0]?.message || "Invalid input.",
        fields: Object.fromEntries(
          err.issues.map((i) => [i.path.join("."), i.message]),
        ),
      });
    res.status(err.status || 500).json({
      error: err.status
        ? err.message
        : "Unable to complete the request. Please try again.",
    });
  });
  return app;
}
module.exports = { createApp };
