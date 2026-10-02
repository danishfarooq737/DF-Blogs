# DF Blogs

MERN blogging platform with an admin panel: Rhombix Technologies internship, Web Development **Task 1 (Blogging Platform with Admin Panel)**.

> **Verification status:** the backend has an automated suite (see Testing). The rewritten frontend (React 18 + Vite) has **not yet been installed, built or run**; the development sandbox had no network access. Run the steps in "Quick start" and fix anything `npm run build` reports before submitting.

## Features
- **Public site:** home page (hero, featured post, categories, latest, popular), paginated browsing, search, category / tag filters that can be combined, category and tag pages, post page at `/blog/:slug` with related posts and share links, comments (signed-in users, rate-limited).
- **Accounts:** register / sign in; short-lived access JWT + rotating refresh token in HTTP-only, SameSite cookies; bcrypt hashing; login rate limiting; backend-enforced roles.
- **Admin panel (`/admin`):** dashboard stats, posts (create, edit, publish / unpublish, delete, search, status filter), Quill rich-text editor with inline image upload, comments (search, approve / hide, delete), users (search, activate / deactivate, change role, delete), categories & tags (rename, merge, delete).
- **Images:** type / extension / magic-byte / size checks, re-encoded to WebP, random filenames, required alt text; storage abstraction with `local` and `cloudinary` providers.
- **UI:** intentionally designed light and dark themes (persisted, no flash on load), Framer Motion (route transitions, card entrance and hover, admin dialogs and toasts; reduced motion respected), responsive layouts (admin tables become cards on phones), skeleton / empty / error states.
- **SEO & compliance:** per-page title, description, canonical and Open Graph / Twitter tags, `sitemap.xml` and `robots.txt` (served by the API), favicon, OG image, Privacy Policy, Terms, Contact page, cookie banner (analytics load only after consent), optional analytics (Plausible or Google Analytics via env).

## Quick start
Requires Node 22.12+ and a MongoDB instance.
```bash
npm run install:all
cp backend/.env.example backend/.env     # set strong JWT secrets and MONGODB_URI
cp frontend/.env.example frontend/.env   # defaults work for local development
npm run seed
npm run dev:api               # http://localhost:5000
npm run dev:web               # http://localhost:5173  (proxies /api and /uploads to the API)
```
Production build of the frontend: `npm run build` (output in `frontend/dist`).

Dev-only seed credentials (never use in production): admin `admin@dfblogs.dev` / `Password@123`; reader `reader@dfblogs.dev` / `Password@123`. The seed script refuses to run when `NODE_ENV=production`.

## Testing
```bash
cd backend && npm test        # 66 unit + 146 integration / system tests
cd frontend && npm test       # unit tests for frontend utilities (node:test, no extra dependencies)
```
Backend integration tests use `mongodb-memory-server` (downloads a MongoDB binary on first run) or the database in `TEST_MONGODB_URI`. There are no browser or component tests yet.

## Structure
```
backend/   config, controllers, middleware, models, routes, services (incl. storage), validators, seed, tests
frontend/  src/{components,hooks,pages,pages/admin}, public/ (favicon, OG image, robots)
```

## API overview
Public: `GET /api/posts` (`page, limit, q, category, tag`), `/api/posts/meta`, `/api/posts/popular`, `/api/posts/:slug`, `POST /api/posts/:slug/comments`, `GET /api/config`.
Auth: `POST /api/auth/register | login | refresh | logout`, `GET /api/auth/session | me`.
Admin (administrator only): `/api/admin/{stats, posts, users, comments, taxonomy, upload}`.
Also: `GET /sitemap.xml`, `GET /robots.txt`, `GET /health`.

## Security measures
Helmet, CORS allow-list, `Origin` check on state-changing requests, express-mongo-sanitize, Zod validation on every input, sanitize-html on write and DOMPurify on render, request size limits, rate limits (API, login, comments, uploads), generic 500 responses, production config refuses placeholder JWT secrets. No software is "100% secure": review before exposing to real users.

## Deployment notes
Serve the built frontend and the API under one domain (or proxy `/api` and `/uploads`) so cookies stay first-party (`COOKIE_SAMESITE=lax`, `VITE_API_URL` empty). If the API is on a different domain, set `VITE_API_URL` to it, `COOKIE_SAMESITE=none` and `CLIENT_URL` to the exact frontend origin (HTTPS required). Backend vars go in `backend/.env` (or your host's env settings); frontend vars (`VITE_*`) are baked in at build time. Set `CLIENT_URL`, `SERVER_URL`, `TRUST_PROXY=1` behind a proxy, strong `JWT_*` secrets and `NODE_ENV=production`. On hosts with ephemeral disks use `IMAGE_STORAGE=cloudinary`, which has not been exercised against a real account. Set `SITE_*` variables for real contact details and address (a placeholder is shown until `SITE_ADDRESS` is set). Legal pages are templates and have not been legally reviewed.

## Known gaps
- Frontend build and runtime behaviour unverified (see top).
- No browser end-to-end tests or frontend component tests.
- No newsletter sign-up (no backend for it, so it was left out rather than faked).
- Backend integration tests were run against FerretDB in the sandbox, not real MongoDB.
