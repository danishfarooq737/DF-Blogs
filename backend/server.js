const mongoose = require('mongoose');

// Loading config validates the environment; report problems as one clear line instead of a stack trace.
let config;
let app;
try {
  config = require('./config');
  app = require('./app');
} catch (error) {
  console.error('Failed to start:', error.message);
  process.exit(1);
}

async function start() {
  const problems = config.productionProblems();
  if (problems.length) {
    throw new Error(`Invalid production configuration:\n  - ${problems.join('\n  - ')}`);
  }

  if (config.isProduction && config.storage.provider === 'local') {
    console.warn('IMAGE_STORAGE=local: uploaded images are lost whenever the host redeploys. Use IMAGE_STORAGE=cloudinary on Render.');
  }

  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 15_000 });
  console.log('MongoDB connected');

  // Bind to all interfaces: hosts such as Render route traffic to the container's PORT.
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`DF Blogs API listening on port ${config.port} (${config.nodeEnv})`);
  });

  const shutdown = () => {
    // Force exit if keep-alive connections prevent a clean close.
    setTimeout(() => process.exit(1), 10_000).unref();
    server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

process.on('unhandledRejection', (reason) => console.error('Unhandled promise rejection:', reason));

start().catch((error) => {
  console.error('Failed to start:', error.message);
  process.exit(1);
});
