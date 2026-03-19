// src/services/preferences.js
// Saves and restores user preferences to/from localStorage

const KEY = 'bingo_prefs_v1';

const DEFAULTS = {
  name:       '',
  teamAbbr:   '',
  sport:      'hockey',
  location:   'liveGame',
  botCount:   0,
};

export function loadPreferences() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePreferences(prefs) {
  try {
    const current = loadPreferences();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // localStorage unavailable (private browsing etc.)
  }
}

export function clearPreferences() {
  try { localStorage.removeItem(KEY); } catch {}
}
