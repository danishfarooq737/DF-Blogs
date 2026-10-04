const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.SERVER_URL = 'http://localhost:5000';
process.env.IMAGE_STORAGE = 'local';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'df-blogs-test-uploads');
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789abcdef0123456789';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-fedcba9876543210fedcba9876';
