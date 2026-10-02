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
});
