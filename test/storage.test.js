const assert = require('assert');
const { createMockKV, installFetchMock, makeContext, muteConsole } = require('./helpers');

function createMockR2() {
  const store = new Map();
  const operations = { put: [], get: [], delete: [] };

  return {
    store,
    operations,
    async delete(key) {
      operations.delete.push(key);
      store.delete(key);
    },
    async put(key, value, options = {}) {
      operations.put.push({ key, options });
      store.set(key, { value, options });
    },
    async get(key) {
      operations.get.push(key);
      const entry = store.get(key);
      if (!entry) return null;
      return {
        body: entry.value,
        httpEtag: '"mock-etag"',
        writeHttpMetadata(headers) {
          const contentType = entry.options?.httpMetadata?.contentType;
          if (contentType) headers.set('Content-Type', contentType);
        },
      };
    },
  };
}

describe('storage providers', function () {
  let restoreConsole;
  let fetchMock;

  beforeEach(function () {
    restoreConsole = muteConsole();
  });

  afterEach(function () {
    if (fetchMock) {
      fetchMock.restore();
      fetchMock = null;
    }
    restoreConsole();
  });

  describe('provider selection', function () {
    it('defaults to the telegram provider', async function () {
      const { getUploadProvider } = await import('../functions/storage/index.js');
      assert.strictEqual(getUploadProvider({}).key, 'telegram');
    });

    it('selects r2 when STORAGE_PROVIDER=r2', async function () {
      const { getUploadProvider } = await import('../functions/storage/index.js');
      assert.strictEqual(getUploadProvider({ STORAGE_PROVIDER: 'r2' }).key, 'r2');
    });

    it('throws on an unknown STORAGE_PROVIDER', async function () {
      const { getUploadProvider } = await import('../functions/storage/index.js');
      assert.throws(() => getUploadProvider({ STORAGE_PROVIDER: 's3' }), /Unknown STORAGE_PROVIDER: s3/);
    });

    it('routes r2-prefixed ids to the r2 provider and everything else to telegram', async function () {
      const { getServingProvider } = await import('../functions/storage/index.js');
      assert.strictEqual(getServingProvider('r2-0123456789abcdef.png').key, 'r2');
      assert.strictEqual(getServingProvider('cat.png').key, 'telegram');
      assert.strictEqual(getServingProvider('AgACAgEAAxkDAAMDZt1Gzs4W8dQPWiQJxO5YSH5X.png').key, 'telegram');
    });
  });

  describe('r2 uploads', function () {
    it('stores the file in the bucket and tags metadata with the provider', async function () {
      const { onRequestPost } = await import('../functions/upload.js');
      const img_url = createMockKV();
      const img_r2 = createMockR2();

      const formData = new FormData();
      formData.append('file', new File(['image-bytes'], 'cat.png', { type: 'image/png' }));

      const res = await onRequestPost(makeContext({
        request: new Request('https://example.com/upload', { method: 'POST', body: formData }),
        env: {
          disable_telemetry: 'true',
          STORAGE_PROVIDER: 'r2',
          img_url,
          img_r2,
        },
      }));

      assert.strictEqual(res.status, 200);
      const [entry] = JSON.parse(await res.text());
      const match = entry.src.match(/^\/file\/(r2-[0-9a-f]{32}\.png)$/);
      assert.ok(match, `expected an r2-prefixed id, got ${entry.src}`);

      const longId = match[1];
      assert.strictEqual(img_r2.operations.put.length, 1);
      assert.strictEqual(img_r2.operations.put[0].key, longId);
      assert.strictEqual(img_r2.operations.put[0].options.httpMetadata.contentType, 'image/png');

      const stored = img_url.snapshot(longId);
      assert.strictEqual(stored.metadata.provider, 'r2');
      assert.strictEqual(stored.metadata.fileName, 'cat.png');
    });

    it('fails clearly when the r2 binding is missing', async function () {
      const { onRequestPost } = await import('../functions/upload.js');

      const formData = new FormData();
      formData.append('file', new File(['image-bytes'], 'cat.png', { type: 'image/png' }));

      const res = await onRequestPost(makeContext({
        request: new Request('https://example.com/upload', { method: 'POST', body: formData }),
        env: {
          disable_telemetry: 'true',
          STORAGE_PROVIDER: 'r2',
        },
      }));

      assert.strictEqual(res.status, 500);
      assert.deepStrictEqual(JSON.parse(await res.text()), {
        error: 'Missing required R2 bucket binding: img_r2',
      });
    });

    it('does not require Telegram configuration when uploading to r2', async function () {
      const { onRequestPost } = await import('../functions/upload.js');
      const img_r2 = createMockR2();

      const formData = new FormData();
      formData.append('file', new File(['hello'], 'notes.txt', { type: 'text/plain' }));

      const res = await onRequestPost(makeContext({
        request: new Request('https://example.com/upload', { method: 'POST', body: formData }),
        env: {
          disable_telemetry: 'true',
          STORAGE_PROVIDER: 'r2',
          img_r2,
        },
      }));

      assert.strictEqual(res.status, 200);
    });
  });

  describe('r2 serving', function () {
    it('serves r2 files without any upstream fetch, even without KV', async function () {
      const { onRequest } = await import('../functions/file/[id].js');
      const img_r2 = createMockR2();
      await img_r2.put('r2-0123456789abcdef0123456789abcdef.png', 'r2-image-bytes', {
        httpMetadata: { contentType: 'image/png' },
      });

      fetchMock = installFetchMock(async () => {
        throw new Error('r2 serving must not fetch external URLs');
      });

      const res = await onRequest(makeContext({
        request: new Request('https://example.com/file/r2-0123456789abcdef0123456789abcdef.png'),
        env: { img_r2 },
        params: { id: 'r2-0123456789abcdef0123456789abcdef.png' },
      }));

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('Content-Type'), 'image/png');
      assert.strictEqual(await res.text(), 'r2-image-bytes');
      assert.strictEqual(fetchMock.calls.length, 0);
    });

    it('returns 404 for missing r2 objects', async function () {
      const { onRequest } = await import('../functions/file/[id].js');
      const img_r2 = createMockR2();

      const res = await onRequest(makeContext({
        request: new Request('https://example.com/file/r2-ffffffffffffffffffffffffffffffff.png'),
        env: { img_r2 },
        params: { id: 'r2-ffffffffffffffffffffffffffffffff.png' },
      }));

      assert.strictEqual(res.status, 404);
    });
  });

  describe('deleting stored files', function () {
    it('removes the object from the bucket for r2 ids', async function () {
      const { getServingProvider } = await import('../functions/storage/index.js');
      const img_r2 = createMockR2();
      const id = 'r2-0123456789abcdef0123456789abcdef.png';
      await img_r2.put(id, 'bytes');

      await getServingProvider(id).deleteFile({ img_r2 }, id);

      assert.deepStrictEqual(img_r2.operations.delete, [id]);
      assert.strictEqual(img_r2.store.has(id), false);
    });

    it('reports a missing bucket binding instead of failing silently', async function () {
      const { r2Provider } = await import('../functions/storage/r2.js');

      await assert.rejects(
        () => r2Provider.deleteFile({}, 'r2-abc.png'),
        /img_r2/,
      );
    });

    it('deletes the channel message for a telegram file', async function () {
      const { getServingProvider } = await import('../functions/storage/index.js');
      fetchMock = installFetchMock(async () => new Response(
        JSON.stringify({ ok: true, result: true }),
        { headers: { 'Content-Type': 'application/json' } },
      ));

      await getServingProvider('BQACAgEAAxkDAAIB.png').deleteFile(
        { TG_Bot_Token: 'token', TG_Chat_ID: '-100200' },
        'BQACAgEAAxkDAAIB.png',
        { messageId: 4321 },
      );

      assert.strictEqual(fetchMock.calls.length, 1);
      assert.ok(fetchMock.calls[0].url.endsWith('/bottoken/deleteMessage'), fetchMock.calls[0].url);
      const body = fetchMock.calls[0].init.body;
      assert.strictEqual(body.get('chat_id'), '-100200');
      assert.strictEqual(body.get('message_id'), '4321');
    });

    it('surfaces a refused telegram delete as an error', async function () {
      const { telegramProvider } = await import('../functions/storage/telegram.js');
      fetchMock = installFetchMock(async () => new Response(
        JSON.stringify({ ok: false, description: "message can't be deleted" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ));

      await assert.rejects(
        () => telegramProvider.deleteFile(
          { TG_Bot_Token: 'token', TG_Chat_ID: '-1' },
          'file.png',
          { messageId: 7 },
        ),
        /can't be deleted/,
      );
    });

    it('cannot delete a telegram file stored before message ids were recorded', async function () {
      const { telegramProvider } = await import('../functions/storage/telegram.js');

      assert.strictEqual(telegramProvider.canDelete({}, {}), false);
      assert.strictEqual(telegramProvider.canDelete({}, null), false);
      assert.strictEqual(telegramProvider.canDelete({}, { messageId: 12 }), true);
    });

    it('treats a telegram delete as best effort, unlike r2', async function () {
      const { telegramProvider } = await import('../functions/storage/telegram.js');
      const { r2Provider } = await import('../functions/storage/r2.js');

      assert.strictEqual(telegramProvider.bestEffortDelete, true);
      assert.ok(!r2Provider.bestEffortDelete);
    });
  });
});
