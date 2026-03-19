// src/hooks/usePreferences.js
import { useState, useCallback } from 'react';

const KEY = 'bingo_battle_prefs_v1';
const DEFAULTS = { name: '', sport: 'hockey', teamAbbr: '', location: 'liveGame', botCount: 0 };

function load() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}

export function usePreferences() {
  const [prefs, setPrefsState] = useState(() => load());

  const setPrefs = useCallback((updates) => {
    setPrefsState(prev => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearPrefs = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch {}
    setPrefsState({ ...DEFAULTS });
  }, []);

  return { prefs, setPrefs, clearPrefs };
}
