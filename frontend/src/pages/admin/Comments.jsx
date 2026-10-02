import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { api } from '../../api.js';
import useAdminList from './useAdminList.js';
import ConfirmDialog from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import SearchForm from '../../components/SearchForm.jsx';
import { EmptyState, ErrorState, Spinner } from '../../components/Feedback.jsx';
import { formatDate } from '../../utils.js';

export default function Comments() {
  const { data, error, loading, reload, q, filter, setParam, run, busyId } = useAdminList('comments', 'status');
  const [toDelete, setToDelete] = useState(null);

  const setStatus = (comment, status) =>
    run(comment._id, () => api.patch(`/admin/comments/${comment._id}`, { status }), status === 'approved' ? 'Comment approved.' : 'Comment hidden.');

  const confirmDelete = async () => {
    const done = await run(toDelete._id, () => api.del(`/admin/comments/${toDelete._id}`), 'Comment deleted.');
    if (done) setToDelete(null);
  };

  return (
    <section aria-labelledby="comments-admin-title">
      <h1 id="comments-admin-title">Comments</h1>
      <div className="toolbar">
        <SearchForm initial={q} onSubmit={(value) => setParam({ q: value })} />
        <label className="sr-only" htmlFor="comment-status">Filter by status</label>
        <select id="comment-status" value={filter} onChange={(event) => setParam({ status: event.target.value })}>
          <option value="">All statuses</option>
          <option value="approved">Approved</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>
      {loading && !data && <Spinner label="Loading comments" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.comments.length === 0 && <EmptyState title="No comments found">Nothing matches the current filters.</EmptyState>}
      {data && data.comments.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Comments</caption>
            <thead>
              <tr><th>Comment</th><th>Author</th><th>Post</th><th>Status</th><th>Date</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.comments.map((comment) => (
                <tr key={comment._id}>
                  <td data-label="Comment" className="wrap">{comment.content}</td>
                  <td data-label="Author">{comment.author?.name || 'Deleted user'}</td>
                  <td data-label="Post">{comment.post ? <Link to={`/blog/${comment.post.slug}`}>{comment.post.title}</Link> : '—'}</td>
                  <td data-label="Status"><span className={`badge badge-${comment.status}`}>{comment.status}</span></td>
                  <td data-label="Date">{formatDate(comment.createdAt)}</td>
                  <td className="actions">
                    <button type="button" className="link" disabled={busyId === comment._id} onClick={() => setStatus(comment, comment.status === 'approved' ? 'hidden' : 'approved')}>
                      {comment.status === 'approved' ? 'Hide' : 'Approve'}
                    </button>
                    <button type="button" className="link danger" onClick={() => setToDelete(comment)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={(next) => setParam({ page: next > 1 ? next : '' })} />}
      <AnimatePresence>
        {toDelete && (
          <ConfirmDialog title="Delete this comment?" message="This cannot be undone." busy={busyId === toDelete._id} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
