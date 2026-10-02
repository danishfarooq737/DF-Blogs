const { z } = require('zod');
const { text, taxonomyName, pageNumber, optionalQueryText, objectId } = require('./common');

const idParamSchema = z.object({ id: objectId });

const adminPostQuerySchema = z.object({
  page: pageNumber,
  q: optionalQueryText(80),
  status: z.enum(['draft', 'published']).optional().catch(undefined),
});

const adminUserQuerySchema = z.object({
  page: pageNumber,
  q: optionalQueryText(60),
  role: z.enum(['user', 'admin']).optional().catch(undefined),
});

const adminCommentQuerySchema = z.object({
  page: pageNumber,
  q: optionalQueryText(80),
  status: z.enum(['approved', 'hidden']).optional().catch(undefined),
});

const userUpdateSchema = z
  .object({
    active: z.boolean().optional(),
    role: z.enum(['user', 'admin']).optional(),
  })
  .strict()
  .refine((body) => body.active !== undefined || body.role !== undefined, 'Nothing to update');

const commentUpdateSchema = z.object({ status: z.enum(['approved', 'hidden'], { errorMap: () => ({ message: 'Invalid status' }) }) });

const uploadBodySchema = z.object({ alt: text('Alt text', { min: 1, max: 140 }) });

const taxonomyParamsSchema = z.object({
  type: z.enum(['category', 'tag']),
  name: taxonomyName('Name').refine(Boolean, 'Name is required'),
});

const taxonomyRenameSchema = z.object({ name: taxonomyName('Name').refine(Boolean, 'Name is required') });

module.exports = {
  idParamSchema,
  adminPostQuerySchema,
  adminUserQuerySchema,
  adminCommentQuerySchema,
  userUpdateSchema,
  commentUpdateSchema,
  uploadBodySchema,
  taxonomyParamsSchema,
  taxonomyRenameSchema,
};
