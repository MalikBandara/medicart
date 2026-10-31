const {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} = require("node:crypto");
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password, hash) {
  const [salt, key] = hash.split(":");
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(key, "hex"),
  );
}
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
module.exports = { hashPassword, verifyPassword, hashToken };
