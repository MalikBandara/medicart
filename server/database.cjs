require("dotenv").config({ quiet: true });
const { DatabaseSync } = require("node:sqlite");
const { mkdirSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
function openDatabase(
  path = process.env.DATABASE_PATH || "./data/medicart.sqlite",
) {
  if (path !== ":memory:")
    mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, name TEXT NOT NULL, dob TEXT NOT NULL, gender TEXT NOT NULL CHECK(gender IN ('Female','Male','Other')), phone TEXT NOT NULL, email TEXT NOT NULL, address TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', archived INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS doctors (id TEXT PRIMARY KEY, name TEXT NOT NULL, specialty TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, fee REAL NOT NULL CHECK(fee >= 0), availability TEXT NOT NULL, startTime TEXT NOT NULL, endTime TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Active','Inactive')), archived INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, patientId TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT, doctorId TEXT NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT, date TEXT NOT NULL, time TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Scheduled','Confirmed','Completed','Cancelled')), createdAt TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS appointment_schedule ON appointments(doctorId,date,time);
    CREATE TRIGGER IF NOT EXISTS prevent_appointment_overlap_insert BEFORE INSERT ON appointments
    WHEN NEW.status != 'Cancelled' AND EXISTS (
      SELECT 1 FROM appointments WHERE doctorId=NEW.doctorId AND date=NEW.date AND status != 'Cancelled'
      AND ABS((CAST(substr(time,1,2) AS INTEGER)*60+CAST(substr(time,4,2) AS INTEGER)) -
        (CAST(substr(NEW.time,1,2) AS INTEGER)*60+CAST(substr(NEW.time,4,2) AS INTEGER))) < 30
    ) BEGIN SELECT RAISE(ABORT, 'appointment_conflict'); END;
    CREATE TRIGGER IF NOT EXISTS prevent_appointment_overlap_update BEFORE UPDATE ON appointments
    WHEN NEW.status != 'Cancelled' AND EXISTS (
      SELECT 1 FROM appointments WHERE id != NEW.id AND doctorId=NEW.doctorId AND date=NEW.date AND status != 'Cancelled'
      AND ABS((CAST(substr(time,1,2) AS INTEGER)*60+CAST(substr(time,4,2) AS INTEGER)) -
        (CAST(substr(NEW.time,1,2) AS INTEGER)*60+CAST(substr(NEW.time,4,2) AS INTEGER))) < 30
    ) BEGIN SELECT RAISE(ABORT, 'appointment_conflict'); END;
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id = 1), value TEXT NOT NULL);
  `);
  db.prepare("INSERT OR IGNORE INTO settings (id,value) VALUES (1,?)").run(
    JSON.stringify({
      name: "Medicart Medical Center",
      email: "hello@medicart.local",
      phone: "+94 11 234 5678",
      address: "42 Park Road, Colombo, Sri Lanka",
      timezone: process.env.CENTER_TIMEZONE || "Asia/Colombo",
      openingTime: "08:00",
      closingTime: "18:00",
      openDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    }),
  );
  return db;
}
function rows(db, table) {
  return db
    .prepare(`SELECT * FROM ${table} ORDER BY createdAt DESC, id DESC`)
    .all()
    .map((row) =>
      table === "doctors"
        ? { ...row, availability: JSON.parse(row.availability) }
        : row,
    );
}
function settings(db) {
  return JSON.parse(
    db.prepare("SELECT value FROM settings WHERE id=1").get().value,
  );
}
module.exports = { openDatabase, rows, settings };
