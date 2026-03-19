// src/hooks/useLocation.js
import { useState, useCallback } from 'react';
import { encode as olcEncode, decode as olcDecode, isValid as olcIsValid } from '../utils/plusCodes.js';

// ── Plus Code helpers ─────────────────────────────────────────────────────────
function encodePlusCode(lat, lng) {
  try { return olcEncode(lat, lng, 10); }
  catch { return null; }
}

function decodePlusCode(code) {
  try {
    const trimmed = code.trim().toUpperCase();
    if (!olcIsValid(trimmed)) return { error: 'Not a valid Plus Code. Example: 85GQ2222+GG' };
    const decoded = olcDecode(trimmed);
    return { lat: decoded.latitudeCenter, lng: decoded.longitudeCenter };
  } catch (err) {
    return { error: `Invalid Plus Code: ${err.message}` };
  }
}

// ── Reverse geocode via OpenStreetMap (free, no key) ─────────────────────────
async function reverseGeocode(lat, lng) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const parts = [
      addr.neighbourhood || addr.suburb || addr.quarter,
      addr.city || addr.town || addr.village || addr.county,
      addr.state,
      addr.country_code?.toUpperCase(),
    ].filter(Boolean);
    return parts.join(', ') || null;
  } catch {
    return null;
  }
}

// ── Zip code via Zippopotam (free, no key) ────────────────────────────────────
async function zipToLocation(zip, countryCode = 'US') {
  try {
    const res = await fetch(`https://api.zippopotam.us/${countryCode}/${zip.trim()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;
    return `${place['place name']}, ${place['state abbreviation'] || place['state']}`;
  } catch {
    return null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useLocation() {
  const [status,              setStatus]              = useState('idle');
  const [locationDescription, setLocationDescription] = useState('');
  const [coords,              setCoords]              = useState(null);
  const [error,               setError]               = useState(null);
  const [plusCode,            setPlusCode]            = useState('');
  const [debugInfo,           setDebugInfo]           = useState('');

  // ── GPS ───────────────────────────────────────────────────────────────────
  const requestGPS = useCallback(async () => {
    setError(null);
    setDebugInfo('');

    if (!navigator.geolocation) {
      setError('Geolocation API not available in this browser. Try zip code or type your location.');
      setStatus('error');
      return null;
    }

    setStatus('requesting');
    setDebugInfo('Asking browser for permission…');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            setDebugInfo(`Got coords (±${Math.round(accuracy)}m). Looking up address…`);
            setCoords({ lat, lng });
            setStatus('resolving');

            const code = encodePlusCode(lat, lng);
            if (code) setPlusCode(code);

            const desc = await reverseGeocode(lat, lng);
            const result = desc || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

            setLocationDescription(result);
            setDebugInfo('');
            setStatus('done');
            resolve({ lat, lng, description: result, plusCode: code });
          } catch (innerErr) {
            const { latitude: lat, longitude: lng } = pos.coords;
            const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            setLocationDescription(fallback);
            setDebugInfo('');
            setStatus('done');
            resolve({ lat, lng, description: fallback });
          }
        },
        (err) => {
          const codeMap = {
            1: { msg: 'Permission denied.', hint: 'iPhone: Settings → Privacy & Security → Location Services → Safari → While Using. Then try again.' },
            2: { msg: 'Position unavailable.', hint: 'Enable Location Services in device Settings, or use zip code.' },
            3: { msg: 'Request timed out.', hint: 'Try moving outside, or use zip code instead.' },
          };
          const info = codeMap[err.code] || { msg: `Error (code ${err.code}).`, hint: 'Try zip code instead.' };
          setError(`${info.msg} ${info.hint}`);
          setDebugInfo(`code=${err.code} "${err.message}"`);
          setStatus('error');
          resolve(null);
        },
        { timeout: 15000, maximumAge: 120000, enableHighAccuracy: false }
      );
    });
  }, []);

  // ── Zip code ──────────────────────────────────────────────────────────────
  const lookupZip = useCallback(async (zip, countryCode = 'US') => {
    if (!zip?.trim()) { setError('Enter a zip or postal code.'); setStatus('error'); return null; }
    setStatus('resolving');
    setError(null);
    const result = await zipToLocation(zip.trim(), countryCode);
    if (!result) {
      setError(`"${zip}" not found. Check the code or try a nearby zip.`);
      setStatus('error');
      return null;
    }
    setLocationDescription(result);
    setStatus('done');
    return { description: result };
  }, []);

  // ── Plus Code ─────────────────────────────────────────────────────────────
  const lookupPlusCode = useCallback(async (code) => {
    if (!code?.trim()) { setError('Enter a Plus Code (e.g. 85GQ2222+GG)'); setStatus('error'); return null; }
    setStatus('resolving');
    setError(null);
    const decoded = decodePlusCode(code.trim());
    if (decoded.error) { setError(decoded.error); setStatus('error'); return null; }
    const { lat, lng } = decoded;
    setCoords({ lat, lng });
    setPlusCode(code.trim().toUpperCase());
    const desc = await reverseGeocode(lat, lng);
    const result = desc || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setLocationDescription(result);
    setStatus('done');
    return { lat, lng, description: result };
  }, []);

  // ── Manual ────────────────────────────────────────────────────────────────
  const setManual = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLocationDescription(trimmed);
    setCoords(null);
    setStatus('done');
    setError(null);
    setDebugInfo('');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setLocationDescription('');
    setCoords(null);
    setError(null);
    setPlusCode('');
    setDebugInfo('');
  }, []);

  return {
    status, locationDescription, coords, error,
    debugInfo, plusCode,
    requestGPS, lookupZip, lookupPlusCode, setManual, reset,
    isSupported: !!navigator.geolocation,
  };
}
