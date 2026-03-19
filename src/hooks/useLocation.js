// src/hooks/useLocation.js
// Handles three location methods: GPS, zip code lookup, and what3words

import { useState, useCallback } from 'react';

// Free reverse geocoding via OpenStreetMap Nominatim (no key required)
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const addr = data.address || {};

    // Build a human-readable location string
    const parts = [
      addr.neighbourhood || addr.suburb || addr.quarter,
      addr.city || addr.town || addr.village || addr.county,
      addr.state,
      addr.country_code?.toUpperCase(),
    ].filter(Boolean);

    return parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || 'Unknown location';
  } catch {
    return null;
  }
}

// Zip code → city/state via free Zippopotam API
async function zipToLocation(zip, countryCode = 'US') {
  try {
    const res  = await fetch(`https://api.zippopotam.us/${countryCode}/${zip.trim()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;
    return `${place['place name']}, ${place['state abbreviation']}`;
  } catch {
    return null;
  }
}

// what3words via our server-side proxy
async function w3wToLocation(words) {
  try {
    const res  = await fetch('/api/w3w-convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!data.available || data.error) return { error: data.reason || data.error, available: data.available };
    return { lat: data.lat, lng: data.lng, nearestPlace: data.nearestPlace, words: data.words, available: true };
  } catch (err) {
    return { error: err.message, available: false };
  }
}

export function useLocation() {
  const [status,      setStatus]      = useState('idle');
  // 'idle' | 'requesting' | 'resolving' | 'done' | 'error'
  const [locationDescription, setLocationDescription] = useState('');
  const [coords,      setCoords]      = useState(null); // { lat, lng }
  const [error,       setError]       = useState(null);
  const [w3wWords,    setW3wWords]    = useState('');

  // ── GPS ──────────────────────────────────────────────────────────────────
  const requestGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device.');
      setStatus('error');
      return null;
    }

    setStatus('requesting');
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setCoords({ lat, lng });
          setStatus('resolving');

          const desc = await reverseGeocode(lat, lng);
          const result = desc || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setLocationDescription(result);
          setStatus('done');
          resolve({ lat, lng, description: result });
        },
        (err) => {
          const msgs = {
            1: 'Location permission denied. Try zip code or what3words instead.',
            2: 'Location unavailable. Try zip code or what3words instead.',
            3: 'Location request timed out.',
          };
          setError(msgs[err.code] || 'Could not get location.');
          setStatus('error');
          resolve(null);
        },
        { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
      );
    });
  }, []);

  // ── Zip code ──────────────────────────────────────────────────────────────
  const lookupZip = useCallback(async (zip, countryCode = 'US') => {
    if (!zip || zip.trim().length < 3) {
      setError('Enter a valid zip/postal code.');
      setStatus('error');
      return null;
    }

    setStatus('resolving');
    setError(null);

    const result = await zipToLocation(zip, countryCode);
    if (!result) {
      setError(`Zip code "${zip}" not found. Try a different code.`);
      setStatus('error');
      return null;
    }

    setLocationDescription(result);
    setStatus('done');
    return { description: result };
  }, []);

  // ── what3words ────────────────────────────────────────────────────────────
  const lookupW3W = useCallback(async (words) => {
    if (!words || words.trim().split(/[\s.]+/).filter(Boolean).length < 3) {
      setError('Enter all three words (e.g. filled.count.soap)');
      setStatus('error');
      return null;
    }

    setStatus('resolving');
    setError(null);

    const result = await w3wToLocation(words);

    if (!result.available) {
      setError('what3words not configured on this server. Use GPS or zip code.');
      setStatus('error');
      return null;
    }
    if (result.error) {
      setError(`what3words error: ${result.error}`);
      setStatus('error');
      return null;
    }

    const { lat, lng, nearestPlace } = result;
    setCoords({ lat, lng });
    setW3wWords(result.words);

    // Reverse geocode the coordinates for a richer description
    const geoDesc = await reverseGeocode(lat, lng);
    const desc = [nearestPlace, geoDesc].filter(Boolean).join(' · ') || result.words;
    setLocationDescription(desc);
    setStatus('done');
    return { lat, lng, description: desc, words: result.words };
  }, []);

  // ── Manual text description ───────────────────────────────────────────────
  const setManual = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLocationDescription(trimmed);
    setCoords(null);
    setStatus('done');
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setLocationDescription('');
    setCoords(null);
    setError(null);
    setW3wWords('');
  }, []);

  return {
    status,
    locationDescription,
    coords,
    error,
    w3wWords,
    requestGPS,
    lookupZip,
    lookupW3W,
    setManual,
    reset,
    isSupported: !!navigator.geolocation,
  };
}
