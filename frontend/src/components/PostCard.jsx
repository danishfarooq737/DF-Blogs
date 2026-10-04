import { Link } from 'react-router';
import { assetUrl } from '../api.js';
import { motion } from 'framer-motion';
import { formatDate } from '../utils.js';

export default function PostCard({ post, index = 0 }) {
  return (
    <motion.article
      className="card post-card"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: Math.min(index, 5) * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <Link to={`/blog/${post.slug}`} className="card-media" tabIndex={-1} aria-hidden="true">
        {post.image?.url ? (
          <img src={assetUrl(post.image.url)} alt="" loading="lazy" width="640" height="360" />
        ) : (
          <div className="card-media-fallback" />
        )}
      </Link>
      <div className="card-body">
        <Link to={`/category/${encodeURIComponent(post.category)}`} className="badge">
          {post.category}
        </Link>
        <h3>
          <Link to={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        {post.excerpt && <p className="excerpt">{post.excerpt}</p>}
        <p className="meta">
          {post.author?.name} · <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </p>
      </div>
    </motion.article>
  );
}
