/**
 * Changes an existing account's name, email and password WITHOUT touching posts or comments.
 * Usage (from the backend folder):
 *   node seed/changeAdmin.js <current-email> "<new name>" <new-email> "<new-password>"
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');

const [, , currentEmail, newName, newEmail, newPassword] = process.argv;

async function run() {
  if (!currentEmail || !newName || !newEmail || !newPassword) {
    throw new Error('Usage: node seed/changeAdmin.js <current-email> "<new name>" <new-email> "<new-password>"');
  }
  if (newPassword.length < 8 || newPassword.length > 72 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    throw new Error('Password must be 8-72 characters and contain a letter and a number');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new Error('New email is not valid');
  }

  await mongoose.connect(config.mongoUri);
  const user = await User.findOne({ email: currentEmail.trim().toLowerCase() });
  if (!user) throw new Error(`No user found with email ${currentEmail}`);

  const email = newEmail.trim().toLowerCase();
  if (email !== user.email && (await User.exists({ email }))) throw new Error('That email is already used by another account');

  user.name = newName.trim().slice(0, 60);
  user.email = email;
  user.password = await bcrypt.hash(newPassword, config.bcryptCost);
  user.refreshHash = undefined; // signs the account out everywhere
  await user.save();
  console.log(`Updated: ${user.name} <${user.email}> (role: ${user.role}). Posts and comments were not changed.`);
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
