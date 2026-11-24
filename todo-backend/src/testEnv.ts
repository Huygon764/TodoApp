// Side-effect module: import it first in any test whose imports load
// config/env.ts, which throws at import when these are unset (e.g. on CI).
// Placeholders only; the unit tests never connect to a database.
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/orbit-test";
process.env.JWT_SECRET ??= "test-secret";
