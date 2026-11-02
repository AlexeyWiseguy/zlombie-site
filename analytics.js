'use strict';

(() => {
  const config = window.ZLOMBIE_ANALYTICS_CONFIG || {};
  const supabaseUrl = typeof config.supabaseUrl === 'string' ? config.supabaseUrl.replace(/\/+$/, '') : '';
  const anonKey = typeof config.anonKey === 'string' ? config.anonKey.trim() : '';
  const sessionStorageKey = 'zlombie-analytics-session';
  const objectPrefix = '/storage/v1/object/public/Zlombie/';
  let sessionId = '';

  function createSessionId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
      const random = Math.floor(Math.random() * 16);
      return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
  }

  function getSessionId() {
    if (sessionId) return sessionId;
    try {
      const savedSessionId = window.sessionStorage.getItem(sessionStorageKey);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(savedSessionId || '')) {
        sessionId = savedSessionId;
        return sessionId;
      }
    } catch (_) {}
    sessionId = createSessionId();
    try {
      window.sessionStorage.setItem(sessionStorageKey, sessionId);
    } catch (_) {}
    return sessionId;
  }

  function getTrackPath(track) {
    if (!track || typeof track.url !== 'string') return '';
    try {
      const trackUrl = new URL(track.url);
      const projectOrigin = new URL(supabaseUrl).origin;
      if (trackUrl.origin !== projectOrigin || !trackUrl.pathname.startsWith(objectPrefix)) return '';
      const path = decodeURIComponent(trackUrl.pathname.slice(objectPrefix.length));
      return path && !path.includes('/') ? path : '';
    } catch (_) {
      return '';
    }
  }

  function recordEvent(eventType, track) {
    const trackPath = getTrackPath(track);
    if (!supabaseUrl || !anonKey || anonKey.includes('PASTE_') || !trackPath || typeof window.fetch !== 'function') return;

    try {
      Promise.resolve(window.fetch(supabaseUrl + '/rest/v1/rpc/record_track_event', {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: 'Bearer ' + anonKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ p_event_type: eventType, p_track_path: trackPath, p_session_id: getSessionId() }),
        keepalive: true
      })).catch(() => {});
    } catch (_) {}
  }

  window.ZLOMBIE_ANALYTICS = {
    trackPlayback: track => recordEvent('play', track),
    trackDownload: track => recordEvent('download', track)
  };
})();