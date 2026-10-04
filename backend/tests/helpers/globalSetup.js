/**
 * Starts one in-memory MongoDB for the whole run (binary downloaded on first use by mongodb-memory-server).
 * Set TEST_MONGODB_URI to run the suite against an existing MongoDB-compatible server instead.
 */
module.exports = async () => {
  if (process.env.TEST_MONGODB_URI) return;
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const server = await MongoMemoryServer.create();
  process.env.TEST_MONGODB_URI = server.getUri();
  globalThis.__MONGO_SERVER__ = server;
};
