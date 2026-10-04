const shared = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/helpers/setupEnv.js'],
  testTimeout: 60000,
  // sanitize-html depends on ESM-only packages; transpile just that chain so Jest (CommonJS) can load them.
  transform: { '\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }] },
  transformIgnorePatterns: ['/node_modules/(?!(htmlparser2|entities|domhandler|domutils|dom-serializer|domelementtype)/)'],
};

module.exports = {
  projects: [
    // Pure logic: no database required.
    { ...shared, displayName: 'unit', testMatch: ['<rootDir>/tests/unit/**/*.test.js'] },
    // HTTP-level tests against a real MongoDB (in-memory by default, or TEST_MONGODB_URI).
    {
      ...shared,
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js', '<rootDir>/tests/system/**/*.test.js'],
      globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
      globalTeardown: '<rootDir>/tests/helpers/globalTeardown.js',
    },
  ],
};
