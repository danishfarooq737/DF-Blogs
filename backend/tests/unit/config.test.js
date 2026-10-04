describe('config in production', () => {
  const load = (env) => {
    jest.resetModules();
    const previous = { ...process.env };
    Object.assign(process.env, { NODE_ENV: 'production' }, env);
    try {
      return require('../../config');
    } finally {
      process.env = previous;
    }
  };

  const strong = 'a'.repeat(40);

  it('refuses placeholder or short JWT secrets', () => {
    expect(() => load({ JWT_ACCESS_SECRET: 'change-me-access', JWT_REFRESH_SECRET: strong })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => load({ JWT_ACCESS_SECRET: strong, JWT_REFRESH_SECRET: 'short' })).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('accepts strong secrets and enables secure cookies', () => {
    const config = load({ JWT_ACCESS_SECRET: strong, JWT_REFRESH_SECRET: `${strong}b` });
    expect(config.cookies.secure).toBe(true);
    expect(config.bcryptCost).toBe(12);
  });

  it('requires Cloudinary credentials when that provider is selected', () => {
    expect(() =>
      load({ JWT_ACCESS_SECRET: strong, JWT_REFRESH_SECRET: `${strong}b`, IMAGE_STORAGE: 'cloudinary', CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '' }),
    ).toThrow(/CLOUDINARY/);
  });

  it('forces public URLs to https and trusts one proxy by default in production', () => {
    const config = load({
      JWT_ACCESS_SECRET: strong,
      JWT_REFRESH_SECRET: `${strong}b`,
      CLIENT_URL: 'http://blog.example.com/',
      SERVER_URL: 'http://api.example.com',
      TRUST_PROXY: '',
    });
    expect(config.clientUrl).toBe('https://blog.example.com');
    expect(config.serverUrl).toBe('https://api.example.com');
    expect(config.trustProxy).toBe(1);
    expect(config.storage.allowedImagePrefixes[0]).toBe('https://api.example.com/uploads/');
  });

  it('falls back to Render\'s RENDER_EXTERNAL_URL for the API origin', () => {
    const config = load({
      JWT_ACCESS_SECRET: strong,
      JWT_REFRESH_SECRET: `${strong}b`,
      SERVER_URL: '',
      RENDER_EXTERNAL_URL: 'http://my-api.onrender.com',
    });
    expect(config.serverUrl).toBe('https://my-api.onrender.com');
  });

  it('reports localhost URLs and a missing database as production problems', () => {
    const config = load({
      JWT_ACCESS_SECRET: strong,
      JWT_REFRESH_SECRET: `${strong}b`,
      CLIENT_URL: 'http://localhost:5173',
      SERVER_URL: 'http://localhost:5000',
      MONGODB_URI: '',
    });
    const problems = config.productionProblems().join(' ');
    expect(problems).toMatch(/MONGODB_URI/);
    expect(problems).toMatch(/CLIENT_URL/);
    expect(problems).toMatch(/SERVER_URL/);
  });

  it('reports no problems for a correct production setup', () => {
    const config = load({
      JWT_ACCESS_SECRET: strong,
      JWT_REFRESH_SECRET: `${strong}b`,
      MONGODB_URI: 'mongodb://db.example.com/x',
      CLIENT_URL: 'https://blog.example.com',
      SERVER_URL: 'https://api.example.com',
    });
    expect(config.productionProblems()).toEqual([]);
  });

  it('only allows valid SameSite values and makes SameSite=None secure', () => {
    const base = { JWT_ACCESS_SECRET: strong, JWT_REFRESH_SECRET: `${strong}b` };
    expect(load({ ...base, COOKIE_SAMESITE: 'bogus' }).cookies.sameSite).toBe('lax');
    expect(load({ ...base, COOKIE_SAMESITE: 'none' }).cookies).toMatchObject({ sameSite: 'none', secure: true });
  });
});
