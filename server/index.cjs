const { openDatabase } = require("./database.cjs");
const { createApp } = require("./app.cjs");
const db = openDatabase();
const server = createApp(db).listen(
  Number(process.env.PORT || 3001),
  "127.0.0.1",
  () =>
    console.log(
      `Medicart API running at http://127.0.0.1:${process.env.PORT || 3001}`,
    ),
);
function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
