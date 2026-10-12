const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');

// Live OpenStreetMap data through the public Overpass API (free, no key).
// Public servers are often overloaded, so: mirrors are tried in order, results are cached,
// and when every mirror fails the last good result for the same area (up to a day old) is used.
const USER_AGENT = 'MedShift360/1.0 (patient app; https://github.com/MSME-project2k26/MedShift360)';
const REQUEST_TIMEOUT_MS = 15_000;
const STALE_FALLBACK_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const MAX_INDEXED_ELEMENTS = 20_000;

const cache = new Map(); // query -> { fetchedAt, elements }
const inFlight = new Map(); // query -> Promise<elements>
// "node-123" -> element, from every result fetched, so a hospital picked from a list loads instantly
const elementIndex = new Map();

function remember(query, elements) {
  cache.delete(query); // re-insert so the Map stays ordered oldest -> newest
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(query, { fetchedAt: Date.now(), elements });

  for (const el of elements) {
    const id = `${el.type}-${el.id}`;
    elementIndex.delete(id);
    elementIndex.set(id, el);
  }
  while (elementIndex.size > MAX_INDEXED_ELEMENTS) elementIndex.delete(elementIndex.keys().next().value);
}

async function fetchFromMirror(url, query) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT, Accept: 'application/json' },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  // Overpass reports overload and timeouts as XML/HTML, sometimes with status 200
  if (!res.ok || !text.trimStart().startsWith('{')) {
    throw new Error(`status ${res.status}: ${text.slice(0, 120).replace(/\s+/g, ' ')}`);
  }
  const json = JSON.parse(text);
  if (json.remark && /runtime error|timed out|out of memory/i.test(json.remark)) throw new Error(json.remark);
  return json.elements || [];
}

async function fetchWithFallback(query) {
  const errors = [];
  for (const url of env.overpassUrls) {
    try {
      return await fetchFromMirror(url, query);
    } catch (err) {
      errors.push({ url, error: err.message });
    }
  }
  const error = new Error('All Overpass mirrors failed');
  error.mirrorErrors = errors;
  throw error;
}

/** Runs an Overpass QL query and returns its elements (fresh for PLACES_CACHE_TTL_SECONDS). */
async function runQuery(query) {
  const hit = cache.get(query);
  if (hit && Date.now() - hit.fetchedAt < env.PLACES_CACHE_TTL_SECONDS * 1000) return hit.elements;
  if (inFlight.has(query)) return inFlight.get(query);

  const promise = fetchWithFallback(query)
    .then((elements) => {
      remember(query, elements);
      return elements;
    })
    .catch((err) => {
      if (hit && Date.now() - hit.fetchedAt < STALE_FALLBACK_MS) {
        logger.warn('Overpass unavailable, serving last good result', {
          ageSeconds: Math.round((Date.now() - hit.fetchedAt) / 1000),
          errors: err.mirrorErrors,
        });
        return hit.elements;
      }
      logger.error('All Overpass mirrors failed', { errors: err.mirrorErrors ?? err.message });
      throw ApiError.badGateway(
        'PLACES_SERVICE_UNAVAILABLE',
        'We could not load nearby hospitals right now. Please try again in a minute. In an emergency, call 108.',
      );
    })
    .finally(() => inFlight.delete(query));
  inFlight.set(query, promise);
  return promise;
}

/** An element already fetched by an earlier query (e.g. the nearby list), or undefined. */
function knownElement(id) {
  return elementIndex.get(id);
}

module.exports = { runQuery, knownElement };
