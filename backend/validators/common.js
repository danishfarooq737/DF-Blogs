const { z } = require('zod');
const { stripTags } = require('../utils/sanitize');

/** Plain-text string: tags stripped, trimmed, bounded. */
const text = (label, { min = 0, max }) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .transform((value) => stripTags(value, max))
    .refine((value) => value.length >= min, {
      message: min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`,
    });

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');

const taxonomyName = (label) =>
  z
    .string({ invalid_type_error: `${label} must be text` })
    .transform((value) => stripTags(value, 40).toLowerCase())
    .refine((value) => value === '' || /^[a-z0-9][a-z0-9 &.+#-]{0,39}$/.test(value), {
      message: `${label} may only contain letters, numbers, spaces and - & . + #`,
    });

const pageNumber = z.coerce.number().int().min(1).max(10000).catch(1);
const optionalQueryText = (max) =>
  z.string().optional().transform((value) => (value ? stripTags(value, max) : ''));

module.exports = { text, objectId, taxonomyName, pageNumber, optionalQueryText };
