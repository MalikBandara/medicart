const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readdirSync, unlinkSync, rmdirSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");
const { openDatabase } = require("../database.cjs");
test("disk persistence and repeatable seeding retain records and revoke old sessions", () => {
  const dir = mkdtempSync(join(tmpdir(), "medicart-test-"));
  const path = join(dir, "test.sqlite");
  const env = {
    ...process.env,
    DATABASE_PATH: path,
    STAFF_EMAIL: "seed-test@example.com",
    STAFF_PASSWORD: "Test-only-password-123",
  };
  let db;
  try {
    const seed = () => {
      const result = spawnSync(process.execPath, ["server/seed.cjs"], {
        env,
        encoding: "utf8",
      });
      assert.equal(result.status, 0, "Seed command should succeed");
    };
    seed();
    db = openDatabase(path);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM patients").get().n, 12);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM doctors").get().n, 5);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM appointments").get().n,
      28,
    );
    db.prepare(
      "UPDATE patients SET notes='Persisted test note' WHERE id='PAT-0001'",
    ).run();
    const staff = db.prepare("SELECT id FROM staff").get();
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
      "test-token-hash",
      staff.id,
      Date.now() + 10000,
    );
    db.close();
    db = null;
    seed();
    db = openDatabase(path);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM patients").get().n, 12);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS n FROM appointments").get().n,
      28,
    );
    assert.equal(
      db.prepare("SELECT notes FROM patients WHERE id='PAT-0001'").get().notes,
      "Persisted test note",
    );
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sessions").get().n, 0);
  } finally {
    db?.close();
    for (const name of readdirSync(dir)) unlinkSync(join(dir, name));
    rmdirSync(dir);
  }
});
