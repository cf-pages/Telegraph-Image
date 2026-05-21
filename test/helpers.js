const assert = require('assert');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeEntry(entry) {
  if (entry && Object.prototype.hasOwnProperty.call(entry, 'metadata')) {
    return {
      value: Object.prototype.hasOwnProperty.call(entry, 'value') ? entry.value : '',
      metadata: clone(entry.metadata),
    };
  }

  return {
    value: '',
    metadata: clone(entry),
  };
}

function createMockKV(initial = {}) {
  const store = new Map();
  const operations = {
    get: [],
    put: [],
    delete: [],
    list: [],
  };

  for (const [key, entry] of Object.entries(initial)) {
    store.set(key, normalizeEntry(entry));
  }

  return {
    operations,
    async getWithMetadata(key) {
      operations.get.push(key);
      const entry = store.get(key);
      if (!entry) return { value: null, metadata: null };
      return { value: entry.value, metadata: clone(entry.metadata) };
    },
    async put(key, value, options = {}) {
      const metadata = clone(options.metadata);
      operations.put.push({ key, value, metadata });
      store.set(key, { value, metadata });
    },
    async delete(key) {
      operations.delete.push(key);
      store.delete(key);
    },
    async list(options = {}) {
      operations.list.push({ ...options });
      const limit = options.limit || 1000;
      const prefix = options.prefix || '';
      const start = options.cursor ? parseInt(options.cursor, 10) : 0;
      const names = Array.from(store.keys()).filter(key => key.startsWith(prefix));
      const keys = names.slice(start, start + limit).map(name => ({
        name,
        metadata: clone(store.get(name).metadata),
      }));
      const next = start + limit < names.length ? String(start + limit) : undefined;

      return {
        keys,
        list_complete: !next,
        cursor: next,
      };
    },
    snapshot(key) {
      const entry = store.get(key);
      return entry ? clone(entry) : undefined;
    },
  };
}

function makeContext(overrides = {}) {
  return {
    request: overrides.request || new Request('https://example.com/'),
    env: overrides.env || {},
    params: overrides.params || {},
    data: overrides.data || {},
    waitUntil: overrides.waitUntil || (() => {}),
    next: overrides.next || (async () => new Response('next')),
  };
}

function installFetchMock(handler) {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (input, init = {}) => {
    const url = input instanceof Request ? input.url : String(input);
    const call = { input, init, url };
    calls.push(call);
    const result = await handler(input, init, calls);
    assert.ok(result instanceof Response, 'fetch mock must return a Response');
    return result;
  };

  return {
    calls,
    restore() {
      global.fetch = originalFetch;
    },
  };
}

function muteConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => {};
  console.error = () => {};

  return () => {
    console.log = originalLog;
    console.error = originalError;
  };
}

module.exports = {
  createMockKV,
  installFetchMock,
  makeContext,
  muteConsole,
};
