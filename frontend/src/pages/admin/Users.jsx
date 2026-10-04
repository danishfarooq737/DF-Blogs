import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { api } from '../../api.js';
import { useAuth } from '../../context.js';
import useAdminList from './useAdminList.js';
import ConfirmDialog from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import SearchForm from '../../components/SearchForm.jsx';
import { EmptyState, ErrorState, Spinner } from '../../components/Feedback.jsx';
import { formatDate } from '../../utils.js';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data, error, loading, reload, q, filter, setParam, run, busyId } = useAdminList('users', 'role');
  const [toDelete, setToDelete] = useState(null);

  const update = (target, changes, message) => run(target._id, () => api.patch(`/admin/users/${target._id}`, changes), message);

  const confirmDelete = async () => {
    const done = await run(toDelete._id, () => api.del(`/admin/users/${toDelete._id}`), 'User deleted.');
    if (done) setToDelete(null);
  };

  return (
    <section aria-labelledby="users-title">
      <h1 id="users-title">Users</h1>
      <div className="toolbar">
        <SearchForm initial={q} onSubmit={(value) => setParam({ q: value })} />
        <label className="sr-only" htmlFor="user-role">Filter by role</label>
        <select id="user-role" value={filter} onChange={(event) => setParam({ role: event.target.value })}>
          <option value="">All roles</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
        </select>
      </div>
      {loading && !data && <Spinner label="Loading users" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.users.length === 0 && <EmptyState title="No users found">Try a different search.</EmptyState>}
      {data && data.users.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Users</caption>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.users.map((person) => {
                const isSelf = person._id === currentUser.id;
                return (
                  <tr key={person._id}>
                    <td data-label="Name"><strong>{person.name}</strong>{isSelf && ' (you)'}</td>
                    <td data-label="Email">{person.email}</td>
                    <td data-label="Role"><span className="badge">{person.role}</span></td>
                    <td data-label="Status"><span className={`badge ${person.active ? 'badge-published' : 'badge-hidden'}`}>{person.active ? 'active' : 'deactivated'}</span></td>
                    <td data-label="Joined">{formatDate(person.createdAt)}</td>
                    <td className="actions">
                      {isSelf ? (
                        <span className="muted small">Cannot modify yourself</span>
                      ) : (
                        <>
                          <button type="button" className="link" disabled={busyId === person._id} onClick={() => update(person, { active: !person.active }, person.active ? 'User deactivated.' : 'User activated.')}>
                            {person.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button type="button" className="link" disabled={busyId === person._id} onClick={() => update(person, { role: person.role === 'admin' ? 'user' : 'admin' }, 'Role updated.')}>
                            Make {person.role === 'admin' ? 'user' : 'admin'}
                          </button>
                          <button type="button" className="link danger" onClick={() => setToDelete(person)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={(next) => setParam({ page: next > 1 ? next : '' })} />}
      <AnimatePresence>
        {toDelete && (
          <ConfirmDialog title="Delete this user?" message={`${toDelete.name} and their comments will be permanently deleted.`} busy={busyId === toDelete._id} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
