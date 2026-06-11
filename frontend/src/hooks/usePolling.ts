import { useEffect, useRef } from 'react';

/**
 * Repeatedly invokes `callback` every `intervalMs` while `enabled` is true.
 *
 * The timer is paused while the document is hidden (e.g. backgrounded tab or
 * app) to avoid wasting NIU Cloud API calls, and fires once immediately when
 * the document becomes visible again so the UI is fresh on return.
 */
export function usePolling(
  callback: () => void,
  intervalMs: number,
  enabled = true,
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const isHidden = () =>
      typeof document !== 'undefined' && document.hidden;

    const intervalId = setInterval(() => {
      if (isHidden()) return;
      savedCallback.current();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (!isHidden()) savedCallback.current();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, enabled]);
}

/** Default cadence for live NIU Cloud telemetry refresh. */
export const LIVE_REFRESH_INTERVAL_MS = 15000;
