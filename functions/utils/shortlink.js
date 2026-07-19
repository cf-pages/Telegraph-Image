import { isEmptyBinding } from './http.js';

const SHORT_KEY_PREFIX = 'short:';
const DEFAULT_LENGTH = 6;
const MIN_LENGTH = 4;
const MAX_LENGTH = 16;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_ALLOCATION_ATTEMPTS = 5;

export function isShortUrlsEnabled(env) {
  return env.ENABLE_SHORT_URLS === 'true';
}

export function shortIdLength(env) {
  if (isEmptyBinding(env.SHORT_URL_LENGTH)) return DEFAULT_LENGTH;

  const parsed = parseInt(env.SHORT_URL_LENGTH, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LENGTH;

  return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, parsed));
}

export function isShortLinkKey(name) {
  return typeof name === 'string' && name.startsWith(SHORT_KEY_PREFIX);
}

// Real file ids always contain an extension dot, so a dotless alphanumeric id
// of plausible length is the only shape that can be a short link.
export function looksLikeShortId(id) {
  return typeof id === 'string'
    && id.length >= MIN_LENGTH
    && id.length <= MAX_LENGTH
    && /^[A-Za-z0-9]+$/.test(id);
}

export function generateShortId(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let id = '';
  for (const byte of bytes) {
    id += ALPHABET[byte % ALPHABET.length];
  }
  return id;
}

export async function allocateShortId(env, generate = generateShortId) {
  const length = shortIdLength(env);

  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt++) {
    const candidate = generate(length);
    const existing = await env.img_url.getWithMetadata(SHORT_KEY_PREFIX + candidate);
    const taken = existing && (existing.value !== null || existing.metadata !== null);
    if (!taken) {
      return candidate;
    }
  }

  return null;
}

export async function putShortLink(env, shortId, longId) {
  await env.img_url.put(SHORT_KEY_PREFIX + shortId, longId, { metadata: { target: longId } });
}

export async function resolveShortId(env, shortId) {
  const record = await env.img_url.getWithMetadata(SHORT_KEY_PREFIX + shortId);
  return record?.metadata?.target || record?.value || null;
}

export async function deleteShortLink(env, shortId) {
  await env.img_url.delete(SHORT_KEY_PREFIX + shortId);
}
