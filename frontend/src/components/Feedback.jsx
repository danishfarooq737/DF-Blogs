import { motion } from 'framer-motion';

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

/** Placeholder cards shown while a post list loads. */
export function CardSkeletons({ count = 6 }) {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading posts">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card skeleton-card">
          <div className="skeleton skeleton-img" />
          <div className="card-body">
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="alert alert-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function FieldError({ id, children }) {
  return children ? (
    <p id={id} className="field-error" role="alert">
      {children}
    </p>
  ) : null;
}

/** Toast stack; each toast is announced politely to assistive technology. */
export function Toasts({ toasts, dismiss }) {
  return (
    <div className="toasts" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          layout
          className={`toast toast-${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
        >
          <span>{toast.message}</span>
          <button type="button" className="icon-btn" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
            ×
          </button>
        </motion.div>
      ))}
    </div>
  );
}
