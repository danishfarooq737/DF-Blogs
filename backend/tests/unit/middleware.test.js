const { originCheck } = require('../../middleware/originCheck');
const { errorHandler } = require('../../middleware/errorHandler');
const { httpError } = require('../../utils/http');
const { validate } = require('../../middleware/validate');
const { z } = require('zod');

const run = (middleware, req) => new Promise((resolve) => middleware(req, {}, (error) => resolve(error)));

describe('originCheck', () => {
  it('allows safe methods from anywhere', async () => {
    expect(await run(originCheck, { method: 'GET', headers: { origin: 'https://evil.example' } })).toBeUndefined();
  });

  it('allows state-changing requests from our own client or without an Origin header', async () => {
    expect(await run(originCheck, { method: 'POST', headers: { origin: 'http://localhost:5173' } })).toBeUndefined();
    expect(await run(originCheck, { method: 'DELETE', headers: {} })).toBeUndefined();
  });

  it('blocks state-changing requests from foreign origins', async () => {
    const error = await run(originCheck, { method: 'POST', headers: { origin: 'https://evil.example' } });
    expect(error.status).toBe(403);
  });
});

describe('errorHandler', () => {
  const call = (err) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, {}, res, () => {});
    return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
  };

  it('passes through client errors with their status', () => {
    expect(call(httpError(404, 'Nope'))).toEqual({ status: 404, body: { message: 'Nope' } });
  });

  it('hides internals of unexpected errors', () => {
    const { status, body } = call(new Error('connection string mongodb://user:secret@host'));
    expect(status).toBe(500);
    expect(body).toEqual({ message: 'Internal server error' });
  });

  it('maps duplicate-key, cast and multer errors', () => {
    expect(call(Object.assign(new Error('dup'), { code: 11000 })).status).toBe(409);
    expect(call(Object.assign(new Error('cast'), { name: 'CastError' })).status).toBe(400);
    expect(call(Object.assign(new Error('big'), { name: 'MulterError', code: 'LIMIT_FILE_SIZE' })).body.message).toBe('Image is too large');
  });
});

describe('validate middleware', () => {
  it('stores parsed data on req.valid and reports the first problem otherwise', async () => {
    const middleware = validate(z.object({ n: z.coerce.number().min(1, 'n too small') }));
    const good = { body: { n: '5' } };
    expect(await run(middleware, good)).toBeUndefined();
    expect(good.valid.body).toEqual({ n: 5 });

    const error = await run(middleware, { body: { n: '0' } });
    expect(error.status).toBe(400);
    expect(error.message).toBe('n too small');
    expect(error.errors[0]).toEqual({ field: 'n', message: 'n too small' });
  });
});
