import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { api, toQuery } from '../../api.js';
import useAsync from '../../hooks/useAsync.js';
import { useToast } from '../../context.js';

/**
 * Shared state for the admin list screens: search / filter / page live in the URL, and
 * `run` wraps a mutation with a busy flag, a toast and a reload.
 */
export default function useAdminList(resource, filterKey) {
  const [params, setParams] = useSearchParams();
  const { notify } = useToast();
  const [busyId, setBusyId] = useState(null);

  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;
  const filter = params.get(filterKey) || '';

  const list = useAsync(() => api.get(`/admin/${resource}${toQuery({ q, page, [filterKey]: filter })}`), [q, page, filter]);

  const setParam = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const run = async (id, action, successMessage) => {
    setBusyId(id);
    try {
      await action();
      notify(successMessage);
      list.reload();
      return true;
    } catch (error) {
      notify(error.message, 'error');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return { ...list, q, page, filter, setParam, run, busyId };
}
