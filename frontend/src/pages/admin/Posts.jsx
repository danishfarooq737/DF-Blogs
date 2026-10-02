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

export default function Posts() {
  const { data, error, loading, reload, q, filter, setParam, run, busyId } = useAdminList('posts', 'status');
  const [toDelete, setToDelete] = useState(null);

  const togglePublish = (post) => {
    const status = post.status === 'published' ? 'draft' : 'published';
    // Load the full post first: the update endpoint replaces the whole document.
    return run(
      post._id,
      async () => {
        const { post: full } = await api.get(`/admin/posts/${post._id}`);
        await api.put(`/admin/posts/${post._id}`, { ...full, status, tags: full.tags, image: full.image || null });
      },
      status === 'published' ? 'Post published.' : 'Post moved to drafts.',
    );
  };

  const confirmDelete = async () => {
    const done = await run(toDelete._id, () => api.del(`/admin/posts/${toDelete._id}`), 'Post deleted.');
    if (done) setToDelete(null);
  };

  return (
    <section aria-labelledby="posts-title">
      <div className="section-head">
        <h1 id="posts-title">Posts</h1>
        <Link to="/admin/posts/new" className="btn">New post</Link>
      </div>
      <div className="toolbar">
        <SearchForm initial={q} onSubmit={(value) => setParam({ q: value })} />
        <label className="sr-only" htmlFor="post-status">Filter by status</label>
        <select id="post-status" value={filter} onChange={(event) => setParam({ status: event.target.value })}>
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      {loading && !data && <Spinner label="Loading posts" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.posts.length === 0 && <EmptyState title="No posts match">Create a post or adjust your filters.</EmptyState>}
      {data && data.posts.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Posts</caption>
            <thead>
              <tr><th>Title</th><th>Category</th><th>Status</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.posts.map((post) => (
                <tr key={post._id}>
                  <td data-label="Title"><strong>{post.title}</strong></td>
                  <td data-label="Category">{post.category}</td>
                  <td data-label="Status"><span className={`badge badge-${post.status}`}>{post.status}</span></td>
                  <td data-label="Updated">{formatDate(post.updatedAt)}</td>
                  <td className="actions">
                    <Link to={`/admin/posts/${post._id}`}>Edit</Link>
                    <button type="button" className="link" disabled={busyId === post._id} onClick={() => togglePublish(post)}>
                      {post.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button type="button" className="link danger" onClick={() => setToDelete(post)}>Delete</button>
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
          <ConfirmDialog
            title="Delete this post?"
            message={`“${toDelete.title}” and its comments will be permanently deleted.`}
            busy={busyId === toDelete._id}
            onConfirm={confirmDelete}
            onCancel={() => setToDelete(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
