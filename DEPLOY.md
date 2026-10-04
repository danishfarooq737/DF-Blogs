# Deploying DF Blogs to Render

Architecture: **one MongoDB Atlas database + one Render Web Service (API) + one Render Static Site (React)**.
The static site forwards `/api`, `/uploads` and `/sitemap.xml` to the API, so visitors only ever see a single `https://` origin.

## 1. Before you start
1. **MongoDB Atlas** - create/keep your cluster. In *Network Access* allow Render (`0.0.0.0/0` is the simplest). Use a dedicated database name such as `df-blogs` in the connection string.
2. **Cloudinary** (free) - copy *Cloud name*, *API key*, *API secret*. Needed because Render's disk is wiped on every deploy, so locally stored uploads would disappear.
3. **Do not upload `backend/.env`** to GitHub or Render. It is git-ignored; use the Render dashboard for production values. (If a `.env` with `localhost` values is deployed, the server now refuses to start and tells you why.)

## 2. Create the services
Render Dashboard > **New + > Blueprint** > pick the repo (it reads `render.yaml`). Render creates `df-blogs-api` and `df-blogs`, and asks for each variable marked `sync: false`.

If your service names differ from `df-blogs-api` / `df-blogs`, edit the two `destination:` URLs and the names in `render.yaml` first.

## 3. Environment variables (API service)
See `backend/.env.production.example` for the full list. The ones people get wrong:

| Variable | Value |
|---|---|
| `CLIENT_URL` | `https://<your-static-site>.onrender.com` - **https**, no trailing slash |
| `SERVER_URL` | `https://<your-api>.onrender.com` - **https**, not localhost |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `MONGODB_URI` | Atlas connection string |
| `IMAGE_STORAGE` | `cloudinary` (+ the three `CLOUDINARY_*` values) |

The frontend needs **no** environment variables. Leave `VITE_API_URL` empty.

## 4. Fixing "Mixed Content" errors
A mixed-content error means an `https://` page tried to load an `http://` resource. Typical causes, all handled now:
- `SERVER_URL` / `CLIENT_URL` set with `http://` -> automatically upgraded to `https://` in production.
- Images uploaded while developing were saved as `http://localhost:5000/uploads/...` in the database or inside post HTML -> rewritten to `SERVER_URL` on every read (`models/Post.js`), and re-pointed again in the browser (`assetUrl`/`safeContent`).
- `VITE_API_URL=http://...` baked into the frontend build -> upgraded at runtime; leave it empty.
- Safety net: the production `index.html` carries `Content-Security-Policy: upgrade-insecure-requests`.

After changing any `VITE_*` variable you must **redeploy the static site** (they are build-time only).

## 5. First login / admin account
`npm run seed` refuses to run in production. If your database already has users, change the admin credentials from the Render Shell (API service > Shell):

    node seed/changeAdmin.js <current-email> "<new name>" <new-email> "<new-strong-password>"

## 6. Checklist
- [ ] `https://<api>.onrender.com/health` returns `{"status":"ok"}`
- [ ] `https://<site>.onrender.com/api/config` returns JSON (proves the rewrite works)
- [ ] Reload `https://<site>.onrender.com/blog` (no 404) and log in
- [ ] Upload an image in the admin editor; its URL starts with `https://res.cloudinary.com/`
- [ ] Browser console shows no "Mixed Content" warnings

Notes: the free API plan sleeps after ~15 minutes idle, so the first request can take ~30-60 s. Rotating `JWT_*` secrets signs everyone out.

## 7. Vercel (frontend only) + Render (API)
The API must stay on Render (or another always-on Node host): it is a long-running Express server that uses `sharp` and cookies, which does not fit Vercel's serverless functions.

1. Deploy the API on Render as above (use the `df-blogs-api` web service).
2. Open `frontend/vercel.json` and replace `df-blogs-api.onrender.com` (3 places) with your real API hostname.
3. Vercel > Add New Project > import the repo > set **Root Directory** to `frontend`. Framework preset: Vite. Do **not** set `VITE_API_URL`.
4. On the Render API service set `CLIENT_URL` to your exact Vercel URL / custom domain (`https://your-site.vercel.app`, no trailing slash). The API rejects write requests from any other origin, so a mismatch shows up as 403 on login.
5. Redeploy the API after changing `CLIENT_URL`; redeploy Vercel after changing `vercel.json`.
