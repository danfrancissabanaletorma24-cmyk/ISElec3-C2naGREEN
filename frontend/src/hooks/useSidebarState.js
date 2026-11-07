import { useCallback, useEffect, useState } from 'react';

const readStoredValue = (key, fallback) => {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === '1';
  } catch {
    return fallback;
  }
};

/**
 * Shared sidebar state for the customer and admin layouts.
 * `collapsed` is persisted (icon-only rail); `mobileOpen` is transient.
 */
export default function useSidebarState({ storageKey, defaultCollapsed = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => readStoredValue(storageKey, defaultCollapsed));

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, collapsed ? '1' : '0');
    } catch {
      // Ignore storage failures (private mode, quota, etc.)
    }
  }, [storageKey, collapsed]);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleCollapsed = useCallback(() => setCollapsed((value) => !value), []);

  return { mobileOpen, openMobile, closeMobile, collapsed, toggleCollapsed };
}
