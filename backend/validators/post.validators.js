const { z } = require('zod');
const { text, taxonomyName, pageNumber, optionalQueryText } = require('./common');
const { cleanHtml, stripTags, isOwnedImageUrl } = require('../utils/sanitize');

const imageSchema = z
  .object({
    url: z.string().refine(isOwnedImageUrl, 'Image must be uploaded through the admin uploader'),
    key: z.string().max(200).optional(),
    alt: text('Image alt text', { min: 1, max: 140 }),
  })
  .nullable()
  .optional();

const postBodySchema = z.object({
  title: text('Title', { min: 1, max: 140 }),
  excerpt: text('Excerpt', { max: 300 }).optional().default(''),
  content: z
    .string({ required_error: 'Content is required', invalid_type_error: 'Content must be text' })
    .max(100_000, 'Content is too long')
    .transform(cleanHtml)
    .refine((html) => stripTags(html).length > 0 || /<img /.test(html), 'Content is required'),
  category: taxonomyName('Category').optional().default('general').transform((c) => c || 'general'),
  tags: z
    .array(taxonomyName('Tag'))
    .max(20, 'Too many tags')
    .optional()
    .default([])
    .transform((tags) => [...new Set(tags.filter(Boolean))].slice(0, 8)),
  status: z.enum(['draft', 'published']).optional().default('draft'),
  image: imageSchema,
});

/** Public listing query (?page, ?limit, ?q, ?category, ?tag). */
const listQuerySchema = z.object({
  page: pageNumber,
  limit: z.coerce.number().int().min(1).max(24).catch(9),
  q: optionalQueryText(80),
  category: optionalQueryText(40).transform((v) => v.toLowerCase()),
  tag: optionalQueryText(40).transform((v) => v.toLowerCase()),
});

const commentBodySchema = z.object({
  content: text('Comment', { min: 2, max: 1000 }),
});

module.exports = { postBodySchema, listQuerySchema, commentBodySchema };
