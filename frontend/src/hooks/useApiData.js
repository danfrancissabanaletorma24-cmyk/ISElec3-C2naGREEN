import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api';

/**
 * Loads a GET endpoint and keeps loading / error state.
 *   const { data, error, loading, reload } = useApiData('/bookings/my', { token });
 * Pass `enabled: false` to wait (e.g. until a token or id exists). The request restarts when `path` changes.
 */
export default function useApiData(path, { token, enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: '', loading: Boolean(enabled && path) });
  const counter = useRef(0);

  const run = useCallback(async () => {
    if (!enabled || !path) return;
    const id = ++counter.current;
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await apiRequest(path, { token });
      if (id === counter.current) setState({ data, error: '', loading: false });
    } catch (error) {
      if (id === counter.current) setState((current) => ({ ...current, error: error.message, loading: false }));
    }
  }, [path, token, enabled]);

  useEffect(() => {
    run();
    return () => { counter.current += 1; };
  }, [run]);

  return { ...state, reload: run };
}
