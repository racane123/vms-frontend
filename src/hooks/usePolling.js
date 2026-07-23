// src/hooks/usePolling.js
import { useEffect, useRef } from 'react';

/**
 * Repeatedly calls `fn` on a self-scheduling timeout (setTimeout after each
 * call resolves), not a fixed setInterval. This matters under real network
 * conditions: setInterval fires on a fixed clock regardless of how long the
 * previous request took, so a slow response (or a stalled connection) causes
 * requests to pile up and fire back-to-back once the network recovers.
 * Self-scheduling guarantees exactly one in-flight request at a time.
 *
 * It also pauses entirely while the tab is hidden (Page Visibility API) and
 * refreshes immediately the moment the tab regains focus. An admin dashboard
 * left open in a background tab was previously polling every 8s forever,
 * burning battery/CPU on chart re-renders nobody was looking at — this was
 * one of the bigger sources of perceived sluggishness.
 */
export function usePolling(fn, intervalMs, deps = []) {
  const timeoutRef = useRef(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled || document.hidden) return;
      await fnRef.current();
      if (!cancelled) {
        timeoutRef.current = setTimeout(tick, intervalMs);
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        clearTimeout(timeoutRef.current);
        tick();
      }
    }

    tick();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
