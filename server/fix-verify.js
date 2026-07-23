/**
 * Run once to mark demo user as email verified:
 *   node fix-verify.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
  const result = await mongoose.connection.collection('users').updateMany(
    {},
    { $set: { emailVerified: true } }
  );
  console.log(`✅ Updated ${result.modifiedCount} user(s) — emailVerified set to true`);
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
