import { pageWindow } from '../utils.js';

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      {pageWindow(page, pages).map((entry, index) =>
        entry === null ? (
          <span key={`gap-${index}`} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            className={`btn btn-sm ${entry === page ? '' : 'btn-ghost'}`}
            aria-current={entry === page ? 'page' : undefined}
            aria-label={`Page ${entry}`}
            onClick={() => onChange(entry)}
          >
            {entry}
          </button>
        ),
      )}
      <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}
