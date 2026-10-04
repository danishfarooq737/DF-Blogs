const crypto = require('crypto');
const mongoose = require('mongoose');
const { resetLimiters } = require('../../middleware/rateLimiters');

/** Connects to a database unique to the calling test file. */
async function connect() {
  const dbName = `df_test_${crypto.randomBytes(5).toString('hex')}`;
  await mongoose.connect(process.env.TEST_MONGODB_URI, { dbName });
}

async function clear() {
  ['::ffff:127.0.0.1', '127.0.0.1', '::1'].forEach(resetLimiters);
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
}

async function disconnect() {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
}

module.exports = { connect, clear, disconnect };
