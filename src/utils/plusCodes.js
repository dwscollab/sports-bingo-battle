// src/utils/plusCodes.js
// Self-contained Open Location Code (Plus Code) encoder/decoder.
// Ported directly from the OLC spec — no npm package needed.
// Spec: https://github.com/google/open-location-code

const CODE_ALPHABET = '23456789CFGHJMPQRVWX';
const ENCODING_BASE = 20;
const PAIR_CODE_LENGTH = 10;
const GRID_CODE_LENGTH = 5;
const CODE_PRECISION_NORMAL = 10;
const SEPARATOR = '+';
const SEPARATOR_POSITION = 8;
const PADDING_CHARACTER = '0';

const LAT_MAX = 90;
const LNG_MAX = 180;

// Degree values for each pair of digits
const PAIR_RESOLUTIONS = [20.0, 1.0, 0.05, 0.0025, 0.000125];

/**
 * Encode a lat/lng into a Plus Code string.
 * @param {number} lat
 * @param {number} lng
 * @param {number} [codeLength=10]
 * @returns {string}
 */
export function encode(lat, lng, codeLength = CODE_PRECISION_NORMAL) {
  // Clip latitude and normalize longitude
  lat = Math.min(LAT_MAX, Math.max(-LAT_MAX, lat));
  if (lng >= 180) lng = lng - 360;
  else if (lng < -180) lng = lng + 360;

  // Adjust into positive range
  lat += LAT_MAX;
  lng += LNG_MAX;

  let code = '';
  let latVal = Math.floor(lat * 1e10 + 0.5) * 1e-10;
  let lngVal = Math.floor(lng * 1e10 + 0.5) * 1e-10;

  // Encode pairs of digits
  for (let i = 0; i < Math.ceil(codeLength / 2); i++) {
    const placeVal = PAIR_RESOLUTIONS[i] || 0.000025;
    const latDigit = Math.floor(latVal / placeVal);
    const lngDigit = Math.floor(lngVal / placeVal);
    latVal -= latDigit * placeVal;
    lngVal -= lngDigit * placeVal;
    code += CODE_ALPHABET[latDigit % ENCODING_BASE];
    code += CODE_ALPHABET[lngDigit % ENCODING_BASE];

    if (code.length === SEPARATOR_POSITION && code.length < codeLength) {
      code += SEPARATOR;
    }
  }

  // Pad if necessary
  while (code.replace(SEPARATOR, '').length < SEPARATOR_POSITION) {
    code += PADDING_CHARACTER;
  }
  if (code.length === SEPARATOR_POSITION) code += SEPARATOR;

  return code;
}

/**
 * Decode a Plus Code into { latitudeCenter, longitudeCenter, latitudeHigh, latitudeLow, longitudeHigh, longitudeLow }
 * @param {string} code
 * @returns {object}
 */
export function decode(code) {
  const clean = code.toUpperCase().replace(/0+\+/, SEPARATOR).replace(SEPARATOR, '');

  let latLo = -LAT_MAX;
  let lngLo = -LNG_MAX;
  let latHi = LAT_MAX;
  let lngHi = LNG_MAX;
  let latRes = 400;
  let lngRes = 400;

  let i = 0;
  while (i < clean.length) {
    if (i < PAIR_CODE_LENGTH) {
      // Pair digits
      const latIdx = CODE_ALPHABET.indexOf(clean[i]);
      const lngIdx = CODE_ALPHABET.indexOf(clean[i + 1]);
      latRes /= ENCODING_BASE;
      lngRes /= ENCODING_BASE;
      latLo += latIdx * latRes;
      lngLo += lngIdx * lngRes;
      latHi = latLo + latRes;
      lngHi = lngLo + lngRes;
      i += 2;
    } else {
      // Grid digits
      const idx = CODE_ALPHABET.indexOf(clean[i]);
      const latIdx = Math.floor(idx / Math.sqrt(ENCODING_BASE));
      const lngIdx = idx % Math.sqrt(ENCODING_BASE);
      latRes /= Math.sqrt(ENCODING_BASE);
      lngRes /= Math.sqrt(ENCODING_BASE);
      latLo += latIdx * latRes;
      lngLo += lngIdx * lngRes;
      latHi = latLo + latRes;
      lngHi = lngLo + lngRes;
      i++;
    }
  }

  return {
    latitudeLow:    latLo,
    latitudeHigh:   latHi,
    longitudeLow:   lngLo,
    longitudeHigh:  lngHi,
    latitudeCenter: (latLo + latHi) / 2,
    longitudeCenter:(lngLo + lngHi) / 2,
  };
}

/**
 * Check if a string is a valid full Plus Code.
 * @param {string} code
 * @returns {boolean}
 */
export function isValid(code) {
  if (!code || typeof code !== 'string') return false;
  const upper = code.toUpperCase();

  // Must contain +
  const sepIdx = upper.indexOf(SEPARATOR);
  if (sepIdx === -1) return false;
  if (sepIdx !== SEPARATOR_POSITION) return false;

  // Characters before + must be valid
  const prefix = upper.slice(0, sepIdx);
  const suffix = upper.slice(sepIdx + 1);

  if (prefix.length !== SEPARATOR_POSITION) return false;

  for (const ch of prefix) {
    if (ch !== PADDING_CHARACTER && !CODE_ALPHABET.includes(ch)) return false;
  }
  for (const ch of suffix) {
    if (!CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}
