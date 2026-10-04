import { Link, useParams, useSearchParams, useNavigate } from 'react-router';
import { api, toQuery } from '../api.js';
import Page from '../Page.jsx';
import PostCard from '../components/PostCard.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchForm from '../components/SearchForm.jsx';
import { CardSkeletons, EmptyState, ErrorState } from '../components/Feedback.jsx';
import useAsync from '../hooks/useAsync.js';

/** Listing page shared by search results, category pages and tag pages. Filters can be combined. */
export default function Browse({ mode }) {
  const { name } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;
  const category = mode === 'category' ? name : params.get('category') || '';
  const tag = mode === 'tag' ? name : params.get('tag') || '';

  const posts = useAsync(() => api.get(`/posts${toQuery({ q, category, tag, page, limit: 9 })}`), [q, category, tag, page]);
  const meta = useAsync(() => api.get('/posts/meta'), []);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const heading = mode === 'category' ? `Category: ${name}` : mode === 'tag' ? `Tag: #${name}` : q ? `Results for “${q}”` : 'Browse all posts';
  const filtered = Boolean(q || category || tag);

  return (
    <Page title={heading} description={`Articles filtered by ${heading.toLowerCase()}.`} noindex={Boolean(q)} wide>
      <header className="page-head">
        <h1>{heading}</h1>
        <SearchForm
          initial={q}
          onSubmit={(value) =>
            mode === 'search' ? update({ q: value }) : navigate(`/search${toQuery({ q: value, [mode]: name })}`)
          }
        />
      </header>

      <div className="filters">
        {meta.data && (
          <>
            <div>
              <h2 className="filter-title">Category</h2>
              <ul className="chips">
                <li>
                  <button type="button" className={`chip ${!category ? 'on' : ''}`} onClick={() => (mode === 'category' ? navigate('/search') : update({ category: '' }))}>
                    All
                  </button>
                </li>
                {meta.data.categories.map((item) => (
                  <li key={item.name}>
                    <button
                      type="button"
                      className={`chip ${category === item.name ? 'on' : ''}`}
                      aria-pressed={category === item.name}
                      onClick={() => (mode === 'category' ? navigate(`/category/${encodeURIComponent(item.name)}`) : update({ category: item.name }))}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="filter-title">Tags</h2>
              <ul className="chips">
                {meta.data.tags.map((item) => (
                  <li key={item.name}>
                    <button
                      type="button"
                      className={`chip ${tag === item.name ? 'on' : ''}`}
                      aria-pressed={tag === item.name}
                      onClick={() => (mode === 'tag' ? navigate(`/tag/${encodeURIComponent(item.name)}`) : update({ tag: tag === item.name ? '' : item.name }))}
                    >
                      #{item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {posts.loading && <CardSkeletons count={6} />}
      {posts.error && <ErrorState message={posts.error} onRetry={posts.reload} />}
      {posts.data && (
        <>
          <p className="muted" role="status" aria-live="polite">
            {posts.data.total} {posts.data.total === 1 ? 'post' : 'posts'} found
          </p>
          {posts.data.posts.length === 0 ? (
            <EmptyState
              title="No posts found"
              action={filtered && (
                <Link to="/search" className="btn btn-ghost">
                  Clear filters
                </Link>
              )}
            >
              Try a different search term or remove a filter.
            </EmptyState>
          ) : (
            <div className="grid">
              {posts.data.posts.map((post, index) => (
                <PostCard key={post._id} post={post} index={index} />
              ))}
            </div>
          )}
          <Pagination page={posts.data.page} pages={posts.data.pages} onChange={(next) => update({ page: next > 1 ? next : '' })} />
        </>
      )}
    </Page>
  );
}
