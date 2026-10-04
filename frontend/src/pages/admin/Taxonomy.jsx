import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { api } from '../../api.js';
import { useToast } from '../../context.js';
import useAsync from '../../hooks/useAsync.js';
import ConfirmDialog from '../../components/Modal.jsx';
import { EmptyState, ErrorState, Spinner } from '../../components/Feedback.jsx';

function TermTable({ type, rows, onRename, onDelete, editing, setEditing, draft, setDraft, busy }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">{type === 'category' ? 'Categories' : 'Tags'}</caption>
        <thead>
          <tr><th>Name</th><th>Posts</th><th><span className="sr-only">Actions</span></th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td data-label="Name">
                {editing === `${type}:${row.name}` ? (
                  <form className="row" onSubmit={(event) => { event.preventDefault(); onRename(type, row.name); }}>
                    <label className="sr-only" htmlFor={`rename-${type}-${row.name}`}>New name for {row.name}</label>
                    <input id={`rename-${type}-${row.name}`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={40} autoFocus />
                    <button className="btn btn-sm" disabled={busy}>Save</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing('')}>Cancel</button>
                  </form>
                ) : (
                  row.name
                )}
              </td>
              <td data-label="Posts">{row.count}</td>
              <td className="actions">
                <button type="button" className="link" onClick={() => { setEditing(`${type}:${row.name}`); setDraft(row.name); }}>Rename / merge</button>
                <button type="button" className="link danger" onClick={() => onDelete({ type, name: row.name })}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Taxonomy() {
  const { notify } = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get('/admin/taxonomy'), []);
  const [editing, setEditing] = useState('');
  const [draft, setDraft] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const mutate = async (action, message) => {
    setBusy(true);
    try {
      await action();
      notify(message);
      setEditing('');
      setToDelete(null);
      reload();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const rename = (type, name) => mutate(() => api.patch(`/admin/taxonomy/${type}/${encodeURIComponent(name)}`, { name: draft }), 'Updated. Existing posts now use the new name.');
  const remove = () => mutate(() => api.del(`/admin/taxonomy/${toDelete.type}/${encodeURIComponent(toDelete.name)}`), 'Deleted.');

  const shared = { onRename: rename, onDelete: setToDelete, editing, setEditing, draft, setDraft, busy };

  return (
    <section aria-labelledby="tax-title">
      <h1 id="tax-title">Categories &amp; tags</h1>
      <p className="muted">Renaming to an existing name merges the two. Deleting a category moves its posts to “general”; deleting a tag removes it from all posts. New terms are created by using them on a post.</p>
      {loading && !data && <Spinner label="Loading taxonomy" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <h2>Categories</h2>
          {data.categories.length ? <TermTable type="category" rows={data.categories} {...shared} /> : <EmptyState title="No categories yet" />}
          <h2>Tags</h2>
          {data.tags.length ? <TermTable type="tag" rows={data.tags} {...shared} /> : <EmptyState title="No tags yet" />}
        </>
      )}
      <AnimatePresence>
        {toDelete && (
          <ConfirmDialog title={`Delete ${toDelete.type} “${toDelete.name}”?`} message="Posts using it will be updated." busy={busy} onConfirm={remove} onCancel={() => setToDelete(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
