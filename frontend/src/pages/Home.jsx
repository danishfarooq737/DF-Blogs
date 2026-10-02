import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api.js';
import Page from '../Page.jsx';
import PostCard from '../components/PostCard.jsx';
import SearchForm from '../components/SearchForm.jsx';
import { CardSkeletons, EmptyState, ErrorState } from '../components/Feedback.jsx';
import useAsync from '../hooks/useAsync.js';
import { useAuth, useSite } from '../context.js';
import { formatDate } from '../utils.js';

export default function Home() {
  const { site } = useSite();
  const { user } = useAuth();
  const navigate = useNavigate();
  const latest = useAsync(() => api.get('/posts?limit=7'), []);
  const meta = useAsync(() => api.get('/posts/meta'), []);
  const popular = useAsync(() => api.get('/posts/popular'), []);

  const [featured, ...rest] = latest.data?.posts || [];

  return (
    <Page description={site.description} wide>
      <section className="hero" aria-labelledby="hero-title">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="eyebrow">The {site.name} journal</p>
          <h1 id="hero-title">Practical writing on engineering, design and security.</h1>
          <p className="lead">{site.description}</p>
          <SearchForm onSubmit={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)} large />
        </motion.div>
        {featured && (
          <Link to={`/blog/${featured.slug}`} className="featured card" aria-label={`Featured: ${featured.title}`}>
            {featured.image?.url && <img src={featured.image.url} alt="" width="640" height="360" />}
            <div className="card-body">
              <span className="badge">Featured · {featured.category}</span>
              <h2>{featured.title}</h2>
              <p className="excerpt">{featured.excerpt}</p>
              <p className="meta">
                {featured.author?.name} · {formatDate(featured.publishedAt)}
              </p>
            </div>
          </Link>
        )}
      </section>

      {meta.data?.categories.length > 0 && (
        <section aria-labelledby="cat-title" className="section">
          <h2 id="cat-title">Categories</h2>
          <ul className="chips">
            {meta.data.categories.map((category) => (
              <li key={category.name}>
                <Link className="chip" to={`/category/${encodeURIComponent(category.name)}`}>
                  {category.name} <span className="chip-count">{category.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="latest-title" className="section">
        <div className="section-head">
          <h2 id="latest-title">Latest posts</h2>
          <Link to="/search">View all →</Link>
        </div>
        {latest.loading && <CardSkeletons count={6} />}
        {latest.error && <ErrorState message={latest.error} onRetry={latest.reload} />}
        {latest.data && !latest.data.posts.length && (
          <EmptyState title="No posts published yet">Check back soon for new articles.</EmptyState>
        )}
        {rest.length > 0 && (
          <div className="grid">
            {rest.map((post, index) => (
              <PostCard key={post._id} post={post} index={index} />
            ))}
          </div>
        )}
      </section>

      {popular.data?.posts.length > 0 && (
        <section aria-labelledby="pop-title" className="section">
          <h2 id="pop-title">Popular discussions</h2>
          <ol className="popular">
            {popular.data.posts.map((post) => (
              <li key={post._id}>
                <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                <span className="muted small">{post.category}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!user && (
        <section className="cta panel" aria-labelledby="cta-title">
          <h2 id="cta-title">Have something to add?</h2>
          <p>Create a free account to comment on articles and join the conversation.</p>
          <Link to="/login?mode=register" className="btn">
            Create an account
          </Link>
        </section>
      )}
    </Page>
  );
}
