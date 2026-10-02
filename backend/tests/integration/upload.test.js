const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../app');
const db = require('../helpers/db');
const { createAdmin, createUser, loginAs, makeImage } = require('../helpers/factories');
const config = require('../../config');

let agent;
beforeAll(async () => {
  await db.connect();
  agent = await loginAs(await createAdmin());
});
afterAll(db.disconnect);

const upload = (a, buffer, { filename = 'photo.png', type = 'image/png', alt = 'A blue square' } = {}) => {
  const req = a.post('/api/admin/upload');
  if (alt !== null) req.field('alt', alt);
  return req.attach('image', buffer, { filename, contentType: type });
};

describe('POST /api/admin/upload', () => {
  it('accepts a PNG, re-encodes it to WebP under a random filename and serves it', async () => {
    const res = await upload(agent, await makeImage('png'));
    expect(res.status).toBe(201);
    expect(res.body.image.alt).toBe('A blue square');
    expect(res.body.image.url).toMatch(/^http:\/\/localhost:5000\/uploads\/[a-f0-9]{32}\.webp$/);
    expect(res.body.image.key).toMatch(/^[a-f0-9]{32}\.webp$/);

    const file = path.join(config.storage.uploadDir, res.body.image.key);
    expect(fs.readFileSync(file).subarray(8, 12).toString()).toBe('WEBP');

    const served = await request(app).get(`/uploads/${res.body.image.key}`);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/webp');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
  });

  it.each([
    ['jpeg', 'photo.jpg', 'image/jpeg'],
    ['webp', 'photo.webp', 'image/webp'],
  ])('accepts %s', async (format, filename, type) => {
    const res = await upload(agent, await makeImage(format), { filename, type });
    expect(res.status).toBe(201);
  });

  it('downsizes very wide images to at most 1600px', async () => {
    const sharp = require('sharp');
    const wide = await sharp({ create: { width: 3200, height: 200, channels: 3, background: '#fff' } }).png().toBuffer();
    const res = await upload(agent, wide);
    const meta = await sharp(path.join(config.storage.uploadDir, res.body.image.key)).metadata();
    expect(meta.width).toBe(1600);
  });

  it('requires alt text', async () => {
    expect((await upload(agent, await makeImage(), { alt: null })).status).toBe(400);
    expect((await upload(agent, await makeImage(), { alt: '   ' })).status).toBe(400);
  });

  it('requires a file', async () => {
    const res = await agent.post('/api/admin/upload').field('alt', 'nothing attached');
    expect(res.status).toBe(400);
  });

  it.each([
    ['an executable', Buffer.from('MZ\x90\x00'), 'malware.exe', 'application/octet-stream'],
    ['a PHP script named .php', Buffer.from('<?php system($_GET[0]); ?>'), 'shell.php', 'application/x-php'],
    ['an SVG (script vector)', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), 'x.svg', 'image/svg+xml'],
    ['a GIF', Buffer.from('GIF89a'), 'a.gif', 'image/gif'],
    ['a double extension trick', Buffer.from('MZ'), 'image.png.exe', 'image/png'],
  ])('rejects %s', async (_label, buffer, filename, type) => {
    const res = await upload(agent, buffer, { filename, type });
    expect(res.status).toBe(400);
  });

  it('rejects text disguised as a PNG (content sniffing)', async () => {
    const res = await upload(agent, Buffer.from('<?php echo 1; ?>'), { filename: 'fake.png', type: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid/i);
  });

  it('rejects files above the size limit', async () => {
    const big = Buffer.concat([await makeImage('png'), Buffer.alloc(config.storage.maxUploadBytes + 10)]);
    const res = await upload(agent, big);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Image is too large');
  });

  it('neutralises path traversal in the client-supplied filename', async () => {
    const res = await upload(agent, await makeImage(), { filename: '../../../etc/passwd.png' });
    expect(res.status).toBe(201);
    expect(res.body.image.key).toMatch(/^[a-f0-9]{32}\.webp$/);
    expect((await request(app).get('/uploads/..%2f..%2fpackage.json')).status).toBe(404);
  });

  it('is limited to administrators', async () => {
    const anonymous = await request(app).post('/api/admin/upload').attach('image', await makeImage(), 'a.png');
    expect(anonymous.status).toBe(401);
    const userAgent = await loginAs(await createUser());
    expect((await upload(userAgent, await makeImage())).status).toBe(403);
  });
});
