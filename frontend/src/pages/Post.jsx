import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { api } from '../api.js';
import Page from '../Page.jsx';
import PostCard from '../components/PostCard.jsx';
import { EmptyState, ErrorState, FieldError, Spinner } from '../components/Feedback.jsx';
import useAsync from '../hooks/useAsync.js';
import { useAuth, useToast } from '../context.js';
import { formatDate, readingMinutes, absoluteUrl } from '../utils.js';

function CommentForm({ slug, onPosted }) {
  const { notify } = useToast();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (text.trim().length < 2) return setError('Write at least 2 characters.');
    setBusy(true);
    setError('');
    try {
      const { comment } = await api.post(`/posts/${slug}/comments`, { content: text });
      onPosted(comment);
      setText('');
      notify('Your comment was posted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="comment">Add a comment</label>
      <textarea
        id="comment"
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={1000}
        rows={4}
        placeholder="Share your thoughts…"
        aria-invalid={Boolean(error)}
        aria-describedby="comment-help comment-error"
      />
      <p id="comment-help" className="muted small">
        {text.length}/1000 · Plain text only. Comments are visible to everyone.
      </p>
      <FieldError id="comment-error">{error}</FieldError>
      <button className="btn" disabled={busy}>
        {busy ? 'Posting…' : 'Post comment'}
      </button>
    </form>
  );
}

export default function Post() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync(() => api.get(`/posts/${slug}`), [slug]);
  const [added, setAdded] = useState([]);

  if (loading && !data) return <Page title="Loading post"><Spinner label="Loading post" /></Page>;
  if (error) {
    return (
      <Page title="Post unavailable" noindex>
        <ErrorState message={error} onRetry={reload} />
        <p>
          <Link to="/search">← Browse all posts</Link>
        </p>
      </Page>
    );
  }

  const { post, related } = data;
  const comments = [...added.filter((entry) => !data.comments.some((existing) => existing._id === entry._id)), ...data.comments];
  const shareUrl = encodeURIComponent(absoluteUrl(`/blog/${post.slug}`));
  const shareText = encodeURIComponent(post.title);

  return (
    <Page title={post.title} description={post.excerpt} image={post.image?.url} type="article">
      <article className="article">
        <header>
          <Link to={`/category/${encodeURIComponent(post.category)}`} className="badge">
            {post.category}
          </Link>
          <h1>{post.title}</h1>
          <p className="meta">
            By {post.author?.name} · <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> · {readingMinutes(post.content)} min read
          </p>
        </header>
        {post.image?.url && <img className="hero-img" src={post.image.url} alt={post.image.alt || ''} width="1200" height="630" />}
        <div className="prose" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
        {post.tags.length > 0 && (
          <ul className="chips" aria-label="Tags">
            {post.tags.map((tag) => (
              <li key={tag}>
                <Link className="chip" to={`/tag/${encodeURIComponent(tag)}`}>
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="share row" aria-label="Share this post">
          <span className="muted">Share:</span>
          <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`}>
            X / Twitter
          </a>
          <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}>
            LinkedIn
          </a>
        </div>
      </article>

      <section className="comments" aria-labelledby="comments-title">
        <h2 id="comments-title">Comments ({comments.length})</h2>
        {user ? (
          <CommentForm slug={slug} onPosted={(comment) => setAdded((list) => [comment, ...list])} />
        ) : (
          <p className="panel">
            <Link to="/login" state={{ from: `/blog/${slug}` }}>Sign in</Link> or <Link to="/login?mode=register">create an account</Link> to join the discussion.
          </p>
        )}
        {comments.length === 0 && <EmptyState title="No comments yet">Be the first to share your thoughts.</EmptyState>}
        <ul className="comment-list">
          {comments.map((comment) => (
            <li key={comment._id} className="comment">
              <p>
                <strong>{comment.author?.name}</strong> <time className="muted small" dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
              </p>
              <p className="comment-text">{comment.content}</p>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="section" aria-labelledby="related-title">
          <h2 id="related-title">Related posts</h2>
          <div className="grid">
            {related.map((item, index) => (
              <PostCard key={item._id} post={item} index={index} />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
