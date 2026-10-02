import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import Page from '../Page.jsx';
import { FieldError } from '../components/Feedback.jsx';
import { useAuth, useToast } from '../context.js';

export default function Login() {
  const { user, setUser } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const destination = location.state?.from || '/';
  if (user) return <Navigate to={user.role === 'admin' && destination === '/' ? '/admin' : destination} replace />;

  const isRegister = mode === 'register';
  const change = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const validate = () => {
    const found = {};
    if (isRegister && !form.name.trim()) found.name = 'Enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) found.email = 'Enter a valid email address';
    if (!form.password) found.password = 'Enter your password';
    else if (isRegister && (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))) {
      found.password = 'Use at least 8 characters with a letter and a number';
    }
    return found;
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const body = isRegister ? form : { email: form.email, password: form.password };
      const { user: signedIn } = await api.post(isRegister ? '/auth/register' : '/auth/login', body);
      setUser(signedIn);
      notify(isRegister ? 'Welcome! Your account is ready.' : `Welcome back, ${signedIn.name.split(' ')[0]}.`);
      navigate(signedIn.role === 'admin' && destination === '/' ? '/admin' : destination, { replace: true });
    } catch (err) {
      const fieldErrors = {};
      (err.errors || []).forEach((entry) => {
        fieldErrors[entry.field] = entry.message;
      });
      setErrors(fieldErrors);
      setFormError(Object.keys(fieldErrors).length ? '' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title={isRegister ? 'Create account' : 'Sign in'} noindex>
      <div className="auth-card panel">
        <h1>{isRegister ? 'Create your account' : 'Sign in'}</h1>
        <p className="muted">{isRegister ? 'Join to comment on posts.' : 'Sign in to comment, or manage the site if you are an admin.'}</p>
        <form onSubmit={submit} noValidate>
          {isRegister && (
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" autoComplete="name" value={form.name} onChange={change('name')} aria-invalid={Boolean(errors.name)} aria-describedby="name-error" />
              <FieldError id="name-error">{errors.name}</FieldError>
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" value={form.email} onChange={change('email')} aria-invalid={Boolean(errors.email)} aria-describedby="email-error" />
            <FieldError id="email-error">{errors.email}</FieldError>
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={change('password')} aria-invalid={Boolean(errors.password)} aria-describedby="password-error" />
            <FieldError id="password-error">{errors.password}</FieldError>
          </div>
          {formError && <p className="alert alert-error" role="alert">{formError}</p>}
          <button className="btn btn-block" disabled={busy}>
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="muted small center-text">
          {isRegister ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" className="link" onClick={() => { setMode(isRegister ? 'login' : 'register'); setErrors({}); setFormError(''); }}>
            {isRegister ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        <p className="muted small center-text">
          By continuing you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </Page>
  );
}
