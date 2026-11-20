import { useEffect, useRef } from 'react';
import { api } from '../services/api';

// Detects keyboard/mouse inactivity while logged in and logs completed idle
// sessions to the backend. A session is logged once activity resumes (dedup by
// design). `paused` (e.g. an explicit break) suppresses logging.
const IDLE_START_MS = 60 * 1000;     // consider idle after 60s of no activity
const CHECK_MS = 10 * 1000;          // poll cadence
const MIN_LOG_SECONDS = 60;          // don't log trivial idles

export default function useIdleTracker(enabled, paused) {
  const lastActive = useRef(Date.now());
  const idleSince = useRef(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!enabled) return undefined;

    const postIdle = (startMs, endMs, reason) => {
      const seconds = Math.round((endMs - startMs) / 1000);
      if (seconds < MIN_LOG_SECONDS) return;
      api.post('/idle-time', {
        idleStart: new Date(startMs).toISOString(),
        idleEnd: new Date(endMs).toISOString(),
        durationSeconds: seconds,
        reason: reason || 'idle',
      }).catch(() => {});
    };

    const onActivity = () => {
      const now = Date.now();
      if (idleSince.current) {
        postIdle(idleSince.current, now, pausedRef.current ? 'break' : 'idle');
        idleSince.current = null;
      }
      lastActive.current = now;
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const interval = setInterval(() => {
      const now = Date.now();
      if (!idleSince.current && now - lastActive.current >= IDLE_START_MS) {
        idleSince.current = lastActive.current;   // idle began at last activity
      }
    }, CHECK_MS);

    // Use visibilitychange only (NO beforeunload — that triggers the browser's
    // "Leave site?" warning dialog). When the tab is hidden we flush any open
    // idle session; when it becomes visible again we resume.
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        if (idleSince.current) {
          postIdle(idleSince.current, Date.now(), pausedRef.current ? 'break' : 'idle');
          idleSince.current = null;
        } else {
          idleSince.current = Date.now();
        }
      } else if (document.visibilityState === 'visible') {
        onActivity();
      }
    };
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [enabled]);
}
