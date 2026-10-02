import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Link, NavLink, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { api } from './api.js';
import { AuthCtx, SiteCtx, ToastCtx } from './context.js';
import { Spinner, Toasts } from './components/Feedback.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import Home from './pages/Home.jsx';

const Browse = lazy(() => import('./pages/Browse.jsx'));
const Post = lazy(() => import('./pages/Post.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Admin = lazy(() => import('./pages/admin/Admin.jsx'));
const staticPage = (name) => lazy(() => import('./pages/Static.jsx').then((module) => ({ default: module[name] })));
const Privacy = staticPage('Privacy');
const Terms = staticPage('Terms');
const Contact = staticPage('Contact');
const NotFound = staticPage('NotFound');
const ThankYou = staticPage('ThankYou');

const DEFAULT_SITE = { name: 'DF Blogs', description: '', contactEmail: '', addressIsPlaceholder: true };

function readStoredTheme() {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* fall through to the system preference */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Admin routes are guarded here only for UX; every /api/admin call is authorised again by the server. */
function AdminRoute({ user }) {
  return user?.role === 'admin' ? <Admin /> : <Navigate to="/login" replace state={{ from: '/admin' }} />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState({ site: DEFAULT_SITE, analytics: { provider: 'none' } });
  const [theme, setTheme] = useState(readStoredTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* preference just isn't persisted */
    }
  }, [theme]);

  useEffect(() => {
    Promise.allSettled([api.get('/auth/session'), api.get('/config')]).then(([session, siteConfig]) => {
      if (session.status === 'fulfilled') setUser(session.value.user);
      if (siteConfig.status === 'fulfilled') setConfig(siteConfig.value);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);
  const notify = useCallback(
    (message, type = 'success') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((list) => [...list, { id, message, type }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
    notify('You have been signed out.');
  }, [notify]);

  const auth = useMemo(() => ({ user, setUser, logout }), [user, logout]);
  const toastValue = useMemo(() => ({ notify }), [notify]);
  const { site } = config;

  if (!ready) return <Spinner label="Loading" />;

  return (
    <AuthCtx.Provider value={auth}>
      <SiteCtx.Provider value={config}>
        <ToastCtx.Provider value={toastValue}>
          <MotionConfig reducedMotion="user">
            <a className="skip-link" href="#main">
              Skip to content
            </a>
            <header className="nav">
              <div className="container nav-inner">
                <Link to="/" className="brand" aria-label={`${site.name} home`}>
                  <span className="brand-mark" aria-hidden="true">
                    {site.name.slice(0, 2)}
                  </span>
                  <span>{site.name}</span>
                </Link>
                <button
                  type="button"
                  className="icon-btn nav-toggle"
                  aria-expanded={menuOpen}
                  aria-controls="primary-nav"
                  aria-label="Toggle navigation menu"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  {menuOpen ? '✕' : '☰'}
                </button>
                <nav id="primary-nav" className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Main">
                  <NavLink to="/" end>
                    Home
                  </NavLink>
                  <NavLink to="/search">Browse</NavLink>
                  <NavLink to="/contact">Contact</NavLink>
                  {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
                  {user ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
                      Sign out ({user.name.split(' ')[0]})
                    </button>
                  ) : (
                    <Link to="/login" className="btn btn-sm">
                      Sign in
                    </Link>
                  )}
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                  >
                    {theme === 'dark' ? '☀' : '☾'}
                  </button>
                </nav>
              </div>
            </header>

            <Suspense fallback={<Spinner label="Loading page" />}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname.startsWith('/admin') ? '/admin' : location.pathname}>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<Browse mode="search" />} />
                  <Route path="/category/:name" element={<Browse mode="category" />} />
                  <Route path="/tag/:name" element={<Browse mode="tag" />} />
                  <Route path="/blog/:slug" element={<Post />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin/*" element={<AdminRoute user={user} />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AnimatePresence>
            </Suspense>

            <footer className="footer">
              <div className="container footer-inner">
                <div>
                  <strong>{site.name}</strong>
                  <p>{site.description}</p>
                </div>
                <nav aria-label="Footer" className="footer-links">
                  <Link to="/search">Browse posts</Link>
                  <Link to="/contact">Contact</Link>
                  <Link to="/privacy">Privacy Policy</Link>
                  <Link to="/terms">Terms &amp; Conditions</Link>
                  <a href="/sitemap.xml">Sitemap</a>
                </nav>
                <p className="muted small">
                  © {new Date().getFullYear()} {site.legalEntity || site.name}. Built for the Rhombix Technologies internship, Task 1.
                </p>
              </div>
            </footer>

            {!user && !location.pathname.startsWith('/login') && (
              <Link to="/login" className="sticky-cta btn">
                Join the discussion
              </Link>
            )}
            <CookieBanner />
            <Toasts toasts={toasts} dismiss={dismiss} />
          </MotionConfig>
        </ToastCtx.Provider>
      </SiteCtx.Provider>
    </AuthCtx.Provider>
  );
}
