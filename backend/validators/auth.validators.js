const { z } = require('zod');
const { text } = require('./common');

const password = z
  .string({ required_error: 'Password is required', invalid_type_error: 'Password must be text' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Password must contain a letter and a number');

const email = z
  .string({ required_error: 'Email is required', invalid_type_error: 'Email must be text' })
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address');

const registerSchema = z.object({ name: text('Name', { min: 1, max: 60 }), email, password });

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required', invalid_type_error: 'Email must be text' }).trim().toLowerCase().max(254),
  password: z.string({ required_error: 'Password is required', invalid_type_error: 'Password must be text' }).max(72),
});

module.exports = { registerSchema, loginSchema, password, email };
