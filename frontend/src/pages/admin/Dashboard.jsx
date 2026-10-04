import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { api } from '../../api.js';
import useAsync from '../../hooks/useAsync.js';
import { ErrorState, Spinner } from '../../components/Feedback.jsx';

const CARDS = [
  { key: 'posts', label: 'Total posts', to: '/admin/posts' },
  { key: 'published', label: 'Published', to: '/admin/posts?status=published' },
  { key: 'drafts', label: 'Drafts', to: '/admin/posts?status=draft' },
  { key: 'users', label: 'Users', to: '/admin/users' },
  { key: 'comments', label: 'Comments', to: '/admin/comments' },
  { key: 'hiddenComments', label: 'Hidden comments', to: '/admin/comments?status=hidden' },
];

export default function Dashboard() {
  const { data, error, loading, reload } = useAsync(() => api.get('/admin/stats'), []);
  return (
    <section aria-labelledby="dash-title">
      <div className="section-head">
        <h1 id="dash-title">Dashboard</h1>
        <Link to="/admin/posts/new" className="btn">
          New post
        </Link>
      </div>
      {loading && <Spinner label="Loading dashboard" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <div className="stats">
          {CARDS.map((card, index) => (
            <motion.div key={card.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <Link to={card.to} className="stat">
                <strong>{data[card.key]}</strong>
                <span>{card.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
