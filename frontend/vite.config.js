import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Production builds only: tell the browser to upgrade any leftover http:// sub-resource request
 * (images, API calls) to https://. This is the last line of defence against "mixed content" errors.
 * It is skipped in development so http://localhost keeps working.
 */
const upgradeInsecureRequests = () => ({
  name: 'upgrade-insecure-requests',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: 'upgrade-insecure-requests' },
      injectTo: 'head-prepend',
    },
  ],
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_DEV_PROXY_TARGET || 'http://localhost:5000';

  if (mode === 'production' && env.VITE_API_URL) {
    if (/^http:\/\//i.test(env.VITE_API_URL)) {
      console.warn(`[vite] VITE_API_URL=${env.VITE_API_URL} is not https; it will be upgraded at runtime, but set the https:// URL.`);
    }
    if (/localhost|127\.0\.0\.1/.test(env.VITE_API_URL)) {
      console.warn('[vite] VITE_API_URL points at localhost; leave it EMPTY for production (Render rewrites /api to the backend).');
    }
  }

  return {
    plugins: [react(), upgradeInsecureRequests()],
    server: { proxy: { '/api': target, '/uploads': target } },
  };
});
