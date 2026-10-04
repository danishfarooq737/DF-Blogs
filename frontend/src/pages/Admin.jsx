import { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { motion, AnimatePresence } from 'framer-motion';
import { api, assetUrl } from '../api.js';
import Page from '../Page.jsx';

const toolbar = [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['blockquote', 'link'], ['clean']];
const blank = { title: '', excerpt: '', content: '', category: '', tags: [], status: 'draft', image: null };

function PostForm({ initial, onDone }) {
  const [f, setF] = useState({ ...initial, tags: (initial.tags || []).join(', ') });
  const [alt, setAlt] = useState(initial.image?.alt || '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    if (!alt.trim()) return setMsg('Enter alt text before uploading an image.');
    const fd = new FormData(); fd.append('image', file); fd.append('alt', alt);
    try { const { image } = await api.post('/admin/upload', fd); setF((s) => ({ ...s, image })); setMsg(''); } catch (e) { setMsg(e.message); }
  };
  const save = async (status) => {
    setBusy(true); setMsg('');
    const body = { ...f, status, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), image: f.image && { ...f.image, alt } };
    try { if (f._id) await api.put(`/admin/posts/${f._id}`, body); else await api.post('/admin/posts', body); onDone(); }
    catch (e) { setMsg(e.message); setBusy(false); }
  };
  return (
    <div className="panel">
      <label htmlFor="t">Title</label><input id="t" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <label htmlFor="x">Excerpt</label><input id="x" value={f.excerpt || ''} maxLength={300} onChange={(e) => setF({ ...f, excerpt: e.target.value })} />
      <div className="row"><div className="grow"><label htmlFor="ca">Category</label><input id="ca" value={f.category || ''} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
        <div className="grow"><label htmlFor="tg">Tags (comma separated)</label><input id="tg" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></div></div>
      <label htmlFor="al">Featured image alt text</label><input id="al" value={alt} onChange={(e) => setAlt(e.target.value)} />
      <label htmlFor="im">Featured image (JPG/PNG/WebP, max 2MB)</label><input id="im" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(e.target.files[0])} />
      {f.image?.url && <img className="thumb" src={assetUrl(f.image.url)} alt={alt} />}
      <label>Content</label><ReactQuill theme="snow" modules={{ toolbar }} value={f.content} onChange={(v) => setF({ ...f, content: v })} />
      {msg && <p className="alert" role="alert">{msg}</p>}
      <div className="row"><button className="btn ghost" disabled={busy} onClick={() => save('draft')}>Save draft</button>
        <button className="btn" disabled={busy} onClick={() => save('published')}>Publish</button>
        <button className="btn ghost" onClick={onDone}>Cancel</button></div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('dashboard');
  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setRows(null); setError('');
    if (tab === 'dashboard') api.get('/admin/stats').then(setStats).catch((e) => setError(e.message));
    else api.get(`/admin/${tab}`).then((d) => setRows(d[tab])).catch((e) => setError(e.message));
  };
  useEffect(load, [tab]);
  const act = (fn) => async () => { try { await fn(); load(); } catch (e) { setError(e.message); } };

  return (
    <Page title="Admin">
      <h1>Admin panel</h1>
      <div className="chips" role="tablist">{['dashboard', 'posts', 'comments', 'users'].map((t) => <button key={t} role="tab" aria-selected={tab === t} className={`chip ${tab === t ? 'on' : ''}`} onClick={() => { setTab(t); setEditing(null); }}>{t}</button>)}</div>
      {error && <p className="alert" role="alert">{error}</p>}
      {tab === 'dashboard' && (stats ? <div className="stats">{Object.entries(stats).map(([k, v]) => <div key={k} className="stat"><strong>{v}</strong><span className="muted">{k}</span></div>)}</div> : <p className="muted">Loading…</p>)}
      <AnimatePresence mode="wait">
        {editing && <motion.div key="form" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><PostForm initial={editing} onDone={() => { setEditing(null); load(); }} /></motion.div>}
      </AnimatePresence>
      {!editing && tab !== 'dashboard' && !rows && !error && <p className="muted">Loading…</p>}
      {!editing && rows && !rows.length && <p className="empty">Nothing here yet.</p>}
      {!editing && tab === 'posts' && rows && <><button className="btn" onClick={() => setEditing(blank)}>New post</button>
        <div className="table-wrap"><table><thead><tr><th>Title</th><th>Status</th><th></th></tr></thead><tbody>{rows.map((p) => <tr key={p._id}><td>{p.title}</td><td><span className="badge">{p.status}</span></td>
          <td className="actions"><button className="link" onClick={() => api.get(`/admin/posts/${p._id}`).then((d) => setEditing(d.post))}>Edit</button>
            <button className="link" onClick={act(() => api.del(`/admin/posts/${p._id}`))}>Delete</button></td></tr>)}</tbody></table></div></>}
      {!editing && tab === 'comments' && rows && <div className="table-wrap"><table><thead><tr><th>Comment</th><th>Author</th><th>Status</th><th></th></tr></thead><tbody>{rows.map((c) => <tr key={c._id}><td>{c.content}</td><td>{c.author?.name}</td><td><span className="badge">{c.status}</span></td>
        <td className="actions"><button className="link" onClick={act(() => api.patch(`/admin/comments/${c._id}`, { status: c.status === 'approved' ? 'hidden' : 'approved' }))}>{c.status === 'approved' ? 'Hide' : 'Approve'}</button>
          <button className="link" onClick={act(() => api.del(`/admin/comments/${c._id}`))}>Delete</button></td></tr>)}</tbody></table></div>}
      {!editing && tab === 'users' && rows && <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th></th></tr></thead><tbody>{rows.map((u) => <tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.active ? 'Yes' : 'No'}</td>
        <td className="actions"><button className="link" onClick={act(() => api.patch(`/admin/users/${u._id}`, { active: !u.active }))}>{u.active ? 'Deactivate' : 'Activate'}</button>
          <button className="link" onClick={act(() => api.patch(`/admin/users/${u._id}`, { role: u.role === 'admin' ? 'user' : 'admin' }))}>Make {u.role === 'admin' ? 'user' : 'admin'}</button></td></tr>)}</tbody></table></div>}
    </Page>
  );
}
