const assert = require('assert');
const { createMockKV, makeContext, muteConsole } = require('./helpers');

const baseMetadata = {
  TimeStamp: 1710000000000,
  ListType: 'None',
  Label: 'None',
  liked: false,
  fileName: 'cat.png',
  fileSize: 123,
};

describe('manage API functions', function () {
  let restoreConsole;

  beforeEach(function () {
    restoreConsole = muteConsole();
  });

  afterEach(function () {
    restoreConsole();
  });

  it('marks a record as blocked while preserving other metadata', async function () {
    const { onRequest } = await import('../functions/api/manage/block/[id].js');
    const img_url = createMockKV({ 'cat.png': baseMetadata });

    const res = await onRequest(makeContext({
      env: { img_url },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    const metadata = JSON.parse(await res.text());
    assert.strictEqual(metadata.ListType, 'Block');
    assert.strictEqual(metadata.fileName, 'cat.png');
    assert.deepStrictEqual(img_url.snapshot('cat.png').metadata, metadata);
  });

  it('marks a record as whitelisted while preserving other metadata', async function () {
    const { onRequest } = await import('../functions/api/manage/white/[id].js');
    const img_url = createMockKV({ 'cat.png': baseMetadata });

    const res = await onRequest(makeContext({
      env: { img_url },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    const metadata = JSON.parse(await res.text());
    assert.strictEqual(metadata.ListType, 'White');
    assert.strictEqual(metadata.fileSize, 123);
    assert.deepStrictEqual(img_url.snapshot('cat.png').metadata, metadata);
  });

  it('deletes a KV record and returns the deleted id', async function () {
    const { onRequest } = await import('../functions/api/manage/delete/[id].js');
    const img_url = createMockKV({ 'cat.png': baseMetadata });

    const res = await onRequest(makeContext({
      env: { img_url },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), '"cat.png"');
    assert.deepStrictEqual(img_url.operations.delete, ['cat.png']);
    assert.strictEqual(img_url.snapshot('cat.png'), undefined);
  });

  it('toggles the liked flag on an existing record', async function () {
    const { onRequest } = await import('../functions/api/manage/toggleLike/[id].js');
    const img_url = createMockKV({ 'cat.png': baseMetadata });

    const res = await onRequest(makeContext({
      env: { img_url },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(JSON.parse(await res.text()), {
      success: true,
      liked: true,
    });
    assert.strictEqual(img_url.snapshot('cat.png').metadata.liked, true);
  });

  it('updates the display filename from the newName query parameter', async function () {
    const { onRequest } = await import('../functions/api/manage/editName/[id].js');
    const img_url = createMockKV({ 'cat.png': baseMetadata });

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/api/manage/editName/cat.png?newName=kitten.png'),
      env: { img_url },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(JSON.parse(await res.text()), {
      success: true,
      fileName: 'kitten.png',
    });
    assert.strictEqual(img_url.snapshot('cat.png').metadata.fileName, 'kitten.png');
  });

  it('returns 404 when toggling liked on a missing record', async function () {
    const { onRequest } = await import('../functions/api/manage/toggleLike/[id].js');
    const img_url = createMockKV();

    const res = await onRequest(makeContext({
      env: { img_url },
      params: { id: 'missing.png' },
    }));

    assert.strictEqual(res.status, 404);
    assert.strictEqual(await res.text(), 'Image metadata not found for ID: missing.png');
  });

  it('reports whether dashboard basic auth is configured', async function () {
    const { onRequest } = await import('../functions/api/manage/check.js');

    const disabled = await onRequest(makeContext({ env: {} }));
    assert.strictEqual(disabled.status, 200);
    assert.strictEqual(await disabled.text(), 'Not using basic auth.');

    const enabled = await onRequest(makeContext({ env: { BASIC_USER: 'admin' } }));
    assert.strictEqual(enabled.status, 200);
    assert.strictEqual(await enabled.text(), 'true');
  });
});

describe('manage API authentication middleware', function () {
  let restoreConsole;

  beforeEach(function () {
    restoreConsole = muteConsole();
  });

  afterEach(function () {
    restoreConsole();
  });

  async function getAuthentication() {
    const mod = await import('../functions/api/manage/_middleware.js');
    return mod.onRequest[1];
  }

  it('blocks dashboard requests when basic auth is configured and absent', async function () {
    const authentication = await getAuthentication();
    const img_url = createMockKV();

    const res = await authentication(makeContext({
      env: { img_url, BASIC_USER: 'admin', BASIC_PASS: 'secret' },
      request: new Request('https://example.com/api/manage/list'),
    }));

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.headers.get('WWW-Authenticate'), 'Basic realm="my scope", charset="UTF-8"');
  });

  it('allows dashboard requests with valid basic auth credentials', async function () {
    const authentication = await getAuthentication();
    const img_url = createMockKV();
    const headers = new Headers({
      Authorization: `Basic ${btoa('admin:secret')}`,
    });

    const res = await authentication(makeContext({
      env: { img_url, BASIC_USER: 'admin', BASIC_PASS: 'secret' },
      request: new Request('https://example.com/api/manage/list', { headers }),
      next: async () => new Response('ok'),
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), 'ok');
  });

  it('returns the dashboard disabled message when KV is not bound', async function () {
    const authentication = await getAuthentication();

    const res = await authentication(makeContext({
      env: { BASIC_USER: 'admin', BASIC_PASS: 'secret' },
      request: new Request('https://example.com/api/manage/list'),
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), 'Dashboard is disabled. Please bind a KV namespace to use this feature.');
  });
});
