const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    active: { type: Boolean, default: true },
    refreshHash: { type: String, select: false },
  },
  { timestamps: true },
);

userSchema.index({ name: 1 });

module.exports = model('User', userSchema);
