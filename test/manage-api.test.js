const assert = require('assert');
const { createMockKV, installFetchMock, makeContext, muteConsole } = require('./helpers');

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

  it('deletes the R2 object along with the record', async function () {
    const { onRequest } = await import('../functions/api/manage/delete/[id].js');
    const id = 'r2-0123456789abcdef0123456789abcdef.png';
    const img_url = createMockKV({ [id]: { ...baseMetadata, fileName: id, provider: 'r2' } });
    const deleted = [];
    const img_r2 = { async delete(key) { deleted.push(key); } };

    const res = await onRequest(makeContext({ env: { img_url, img_r2 }, params: { id } }));

    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(deleted, [id], 'the bucket object must be removed too');
    assert.strictEqual(img_url.snapshot(id), undefined);
  });

  it('keeps the record when the R2 object cannot be deleted, so it can be retried', async function () {
    const { onRequest } = await import('../functions/api/manage/delete/[id].js');
    const id = 'r2-0123456789abcdef0123456789abcdef.png';
    const img_url = createMockKV({ [id]: { ...baseMetadata, fileName: id } });
    const img_r2 = { async delete() { throw new Error('bucket unavailable'); } };

    const res = await onRequest(makeContext({ env: { img_url, img_r2 }, params: { id } }));

    assert.strictEqual(res.status, 500);
    assert.ok(img_url.snapshot(id), 'the record must survive a failed object delete');
    assert.deepStrictEqual(img_url.operations.delete, []);
  });

  it('still removes the record when the bucket binding is gone', async function () {
    const { onRequest } = await import('../functions/api/manage/delete/[id].js');
    const id = 'r2-0123456789abcdef0123456789abcdef.png';
    const img_url = createMockKV({ [id]: { ...baseMetadata, fileName: id } });

    // img_r2 unbound: the object is unreachable for good, so the row must not
    // become permanently undeletable
    const res = await onRequest(makeContext({ env: { img_url }, params: { id } }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(img_url.snapshot(id), undefined);
  });

  it('deletes the Telegram channel message along with the record', async function () {
    const { onRequest } = await import('../functions/api/manage/delete/[id].js');
    const img_url = createMockKV({ 'cat.png': { ...baseMetadata, messageId: 99 } });
    const fetchMock = installFetchMock(async () => new Response(
      JSON.stringify({ ok: true, result: true }),
      { headers: { 'Content-Type': 'application/json' } },
    ));

    try {
      const res = await onRequest(makeContext({
        env: { img_url, TG_Bot_Token: 'token', TG_Chat_ID: '-1' },
        params: { id: 'cat.png' },
      }));

      assert.strictEqual(res.status, 200);
      assert.ok(fetchMock.calls[0].url.includes('/deleteMessage'), 'deleteMessage must be called');
      assert.strictEqual(fetchMock.calls[0].init.body.get('message_id'), '99');
      assert.strictEqual(img_url.snapshot('cat.png'), undefined);
    } finally {
      fetchMock.restore();
    }
  });

  it('still removes the record when the Telegram message cannot be deleted', async function () {
    const { onRequest } = await import('../functions/api/manage/delete/[id].js');
    const img_url = createMockKV({ 'cat.png': { ...baseMetadata, messageId: 99 } });
    const fetchMock = installFetchMock(async () => new Response(
      JSON.stringify({ ok: false, description: 'message to delete not found' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    ));

    try {
      // Telegram deletion is best effort: the message may already be gone, and
      // the file costs the deployment nothing, so the row must not get stuck
      const res = await onRequest(makeContext({
        env: { img_url, TG_Bot_Token: 'token', TG_Chat_ID: '-1' },
        params: { id: 'cat.png' },
      }));

      assert.strictEqual(res.status, 200);
      assert.strictEqual(img_url.snapshot('cat.png'), undefined);
    } finally {
      fetchMock.restore();
    }
  });

  it('removes the record without any Telegram call for files predating message ids', async function () {
    const { onRequest } = await import('../functions/api/manage/delete/[id].js');
    const img_url = createMockKV({ 'cat.png': baseMetadata });
    const fetchMock = installFetchMock(async () => {
      throw new Error('must not call Telegram without a message id');
    });

    try {
      const res = await onRequest(makeContext({
        env: { img_url, TG_Bot_Token: 'token', TG_Chat_ID: '-1' },
        params: { id: 'cat.png' },
      }));

      assert.strictEqual(res.status, 200);
      assert.strictEqual(fetchMock.calls.length, 0);
      assert.strictEqual(img_url.snapshot('cat.png'), undefined);
    } finally {
      fetchMock.restore();
    }
  });

  it('removes the short link mapping when deleting a record', async function () {
    const { onRequest } = await import('../functions/api/manage/delete/[id].js');
    const img_url = createMockKV({
      'cat.png': { ...baseMetadata, shortId: 'AbC123' },
      'short:AbC123': { value: 'cat.png', metadata: { target: 'cat.png' } },
    });

    const res = await onRequest(makeContext({
      env: { img_url },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(img_url.snapshot('cat.png'), undefined);
    assert.strictEqual(img_url.snapshot('short:AbC123'), undefined);
  });

  it('hides internal bookkeeping keys from list results', async function () {
    const { onRequest } = await import('../functions/api/manage/list.js');
    const img_url = createMockKV({
      'cat.png': baseMetadata,
      'r2-1234abcd.png': baseMetadata,
      'short:AbC123': { value: 'cat.png', metadata: { target: 'cat.png' } },
      'moderation:live-models': { value: '[]', metadata: null },
    });

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/api/manage/list'),
      env: { img_url },
    }));

    assert.strictEqual(res.status, 200);
    const data = JSON.parse(await res.text());
    assert.deepStrictEqual(data.keys.map(key => key.name), ['cat.png', 'r2-1234abcd.png']);
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
