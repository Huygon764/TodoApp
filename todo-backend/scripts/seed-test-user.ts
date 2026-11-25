// Creates (or resets) a local test account for development.
// Run from todo-backend: bun scripts/seed-test-user.ts
// Uses MONGODB_URI from the environment, else the local default below.
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI_SEED || "mongodb://localhost:27017/todo-app";
const username = "testuser";
const password = "orbit-test-123";

if (!/^mongodb:\/\/(localhost|127\.0\.0\.1)[:/]/.test(uri)) {
  throw new Error(`refusing to seed a non-local database: ${uri}`);
}
process.env.MONGODB_URI ??= uri;
process.env.JWT_SECRET ??= "seed-only";
const { User } = await import("../src/models/user.js");

await mongoose.connect(uri);
const dbs = await mongoose.connection.db!.admin().listDatabases();
console.log("databases:", dbs.databases.map((d) => d.name).join(", "));
await User.deleteMany({ username });
await User.create({ username, password, timezone: "Asia/Ho_Chi_Minh" });
console.log(`test account ready in ${uri}`);
await mongoose.disconnect();
