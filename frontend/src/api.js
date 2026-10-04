import { secureUrl, secureHtml } from './utils.js';

/** Error carrying the HTTP status and any field-level validation errors returned by the API. */
export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Base URL of the API. Leave VITE_API_URL empty in development (the Vite dev server proxies /api)
 * and whenever the host rewrites /api to the backend. Set it only when the API lives on another origin.
 */
const API_BASE = secureUrl(String(import.meta.env?.VITE_API_URL || '').replace(/\/+$/, ''));

/** Image/asset URL that is safe on the current page (no http:// on https, no localhost in production). */
export const assetUrl = (url) => secureUrl(url, { base: API_BASE });

/** Post HTML with every embedded image URL made safe in the same way. */
export const safeContent = (html) => secureHtml(html, { base: API_BASE });

const FRIENDLY_MESSAGES = {
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again shortly.',
};

async function request(path, options = {}, canRetry = true) {
  const isForm = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      credentials: 'include',
      ...options,
      headers: isForm ? { ...options.headers } : { 'Content-Type': 'application/json', ...options.headers },
      body: isForm || options.body === undefined ? options.body : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  // The access token is short-lived: renew it once from the refresh cookie, then replay the request.
  if (response.status === 401 && canRetry && !path.startsWith('/auth/')) {
    const refreshed = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' }).catch(() => null);
    if (refreshed?.ok) return request(path, options, false);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message || FRIENDLY_MESSAGES[response.status] || 'Something went wrong', response.status, data.errors);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

/** Builds a query string, skipping empty values. */
export const toQuery = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};
