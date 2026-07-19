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

describe('file proxy function', function () {
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

  async function getOnRequest() {
    return (await import('../functions/file/[id].js')).onRequest;
  }

  it('proxies Telegraph files and initializes missing metadata in KV', async function () {
    const onRequest = await getOnRequest();
    const img_url = createMockKV();

    fetchMock = installFetchMock(async input => {
      assert.strictEqual(String(input), 'https://telegra.ph//file/cat.png?size=large');
      return new Response('image-body', {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      });
    });

    const request = new Request('https://example.com/file/cat.png?size=large');
    const res = await onRequest(makeContext({
      request,
      env: { img_url },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), 'image-body');
    assert.strictEqual(fetchMock.calls.length, 1);

    const stored = img_url.snapshot('cat.png');
    assert.strictEqual(stored.value, '');
    assert.strictEqual(stored.metadata.ListType, 'None');
    assert.strictEqual(stored.metadata.Label, 'None');
    assert.strictEqual(stored.metadata.fileName, 'cat.png');
    assert.strictEqual(stored.metadata.fileSize, 0);
    assert.strictEqual(stored.metadata.liked, false);
    assert.ok(Number.isFinite(stored.metadata.TimeStamp));
  });

  it('returns previewable proxied files inline when KV is not bound', async function () {
    const onRequest = await getOnRequest();

    fetchMock = installFetchMock(async input => {
      assert.strictEqual(String(input), 'https://telegra.ph//file/cat.png');
      return new Response('image-body', {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      });
    });

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/cat.png'),
      env: {},
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Type'), 'image/png');
    assert.strictEqual(res.headers.get('Content-Disposition'), 'inline; filename="cat.png"');
    assert.strictEqual(await res.text(), 'image-body');
  });

  it('fixes the Content-Type from the file extension when upstream sends octet-stream', async function () {
    const onRequest = await getOnRequest();

    fetchMock = installFetchMock(async input => {
      assert.strictEqual(String(input), 'https://telegra.ph//file/cat.png');
      return new Response('image-body', {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    });

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/cat.png'),
      env: {},
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Type'), 'image/png');
    assert.strictEqual(res.headers.get('Content-Disposition'), 'inline; filename="cat.png"');
    assert.strictEqual(await res.text(), 'image-body');
  });

  it('leaves octet-stream files with unknown extensions untouched', async function () {
    const onRequest = await getOnRequest();

    fetchMock = installFetchMock(async () => new Response('binary-body', {
      status: 200,
      headers: { 'Content-Type': 'application/octet-stream' },
    }));

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/archive.bin'),
      env: {},
      params: { id: 'archive.bin' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Type'), 'application/octet-stream');
    assert.strictEqual(res.headers.get('Content-Disposition'), null);
    assert.strictEqual(await res.text(), 'binary-body');
  });

  it('does not promote svg uploads to image/svg+xml', async function () {
    const onRequest = await getOnRequest();

    fetchMock = installFetchMock(async () => new Response('<svg/>', {
      status: 200,
      headers: { 'Content-Type': 'application/octet-stream' },
    }));

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/sketch.svg'),
      env: {},
      params: { id: 'sketch.svg' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Type'), 'application/octet-stream');
  });

  it('does not force inline disposition for non-previewable files', async function () {
    const onRequest = await getOnRequest();

    fetchMock = installFetchMock(async input => {
      assert.strictEqual(String(input), 'https://telegra.ph//file/archive.zip');
      return new Response('zip-body', {
        status: 200,
        headers: { 'Content-Type': 'application/zip' },
      });
    });

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/archive.zip'),
      env: {},
      params: { id: 'archive.zip' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Disposition'), null);
    assert.strictEqual(await res.text(), 'zip-body');
  });

  it('redirects blocked files to the blocked image page', async function () {
    const onRequest = await getOnRequest();
    const img_url = createMockKV({
      'cat.png': { ...baseMetadata, ListType: 'Block' },
    });

    fetchMock = installFetchMock(async () => new Response('image-body', { status: 200 }));

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/cat.png'),
      env: { img_url },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get('Location'), 'https://example.com/block-img.html');
  });

  it('runs moderation and stores the returned label for allowed files', async function () {
    const onRequest = await getOnRequest();
    const img_url = createMockKV({
      'cat.png': baseMetadata,
    });

    fetchMock = installFetchMock(async (input, init, calls) => {
      if (calls.length === 1) {
        assert.strictEqual(String(input), 'https://telegra.ph//file/cat.png');
        return new Response('image-body', { status: 200 });
      }

      assert.strictEqual(String(input), 'https://api.moderatecontent.com/moderate/?key=moderate-key&url=https://telegra.ph/file/cat.png');
      return Response.json({ rating_label: 'everyone' });
    });

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/cat.png'),
      env: { img_url, ModerateContentApiKey: 'moderate-key' },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), 'image-body');
    assert.strictEqual(img_url.snapshot('cat.png').metadata.Label, 'everyone');
  });

  it('runs moderation and redirects adult files after saving metadata', async function () {
    const onRequest = await getOnRequest();
    const img_url = createMockKV({
      'cat.png': baseMetadata,
    });

    fetchMock = installFetchMock(async (input, init, calls) => {
      if (calls.length === 1) {
        assert.strictEqual(String(input), 'https://telegra.ph//file/cat.png');
        return new Response('image-body', { status: 200 });
      }

      assert.strictEqual(String(input), 'https://api.moderatecontent.com/moderate/?key=moderate-key&url=https://telegra.ph/file/cat.png');
      return Response.json({ rating_label: 'adult' });
    });

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/cat.png'),
      env: { img_url, ModerateContentApiKey: 'moderate-key' },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get('Location'), 'https://example.com/block-img.html');
    assert.strictEqual(img_url.snapshot('cat.png').metadata.Label, 'adult');
  });

  it('redirects non-whitelisted files when whitelist mode is enabled', async function () {
    const onRequest = await getOnRequest();
    const img_url = createMockKV({
      'cat.png': baseMetadata,
    });

    fetchMock = installFetchMock(async () => new Response('image-body', { status: 200 }));

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/cat.png'),
      env: { img_url, WhiteList_Mode: 'true' },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get('Location'), 'https://example.com/whitelist-on.html');
  });

  it('returns whitelisted files inline even when whitelist mode is enabled', async function () {
    const onRequest = await getOnRequest();
    const img_url = createMockKV({
      'cat.png': { ...baseMetadata, ListType: 'White' },
    });

    fetchMock = installFetchMock(async () => new Response('image-body', { status: 200 }));

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/cat.png'),
      env: { img_url, WhiteList_Mode: 'true' },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Disposition'), 'inline; filename="cat.png"');
    assert.strictEqual(await res.text(), 'image-body');
    assert.deepStrictEqual(img_url.operations.put, []);
  });

  it('resolves short links for Telegraph-stored files', async function () {
    const onRequest = await getOnRequest();
    const img_url = createMockKV({
      'cat.png': { ...baseMetadata, shortId: 'AbC123' },
      'short:AbC123': { value: 'cat.png', metadata: { target: 'cat.png' } },
    });

    fetchMock = installFetchMock(async input => {
      assert.strictEqual(String(input), 'https://telegra.ph//file/cat.png');
      return new Response('image-body', {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      });
    });

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/AbC123'),
      env: { img_url, ENABLE_SHORT_URLS: 'true' },
      params: { id: 'AbC123' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Disposition'), 'inline; filename="cat.png"');
    assert.strictEqual(await res.text(), 'image-body');
    assert.strictEqual(fetchMock.calls.length, 1);
  });

  it('resolves short links for Bot API files and fixes their Content-Type', async function () {
    const onRequest = await getOnRequest();
    const telegramFileId = 'AgACAgEAAxkDAAMDZt1Gzs4W8dQPWiQJxO5YSH5X-gsAAt-sMRuWNelGOSaEM_9lHHgBAAMCAANtAAM2BA';
    const longId = `${telegramFileId}.png`;
    const img_url = createMockKV({
      [longId]: { ...baseMetadata, shortId: 'ZzY987' },
      'short:ZzY987': { value: longId, metadata: { target: longId } },
    });

    fetchMock = installFetchMock(async (input, init, calls) => {
      if (calls.length === 1) {
        assert.strictEqual(String(input), `https://api.telegram.org/botbot-token/getFile?file_id=${telegramFileId}`);
        return Response.json({
          ok: true,
          result: { file_path: 'photos/file_1.png' },
        });
      }

      assert.strictEqual(String(input), 'https://api.telegram.org/file/botbot-token/photos/file_1.png');
      return new Response('telegram-file', {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    });

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/ZzY987'),
      env: { img_url, ENABLE_SHORT_URLS: 'true', TG_Bot_Token: 'bot-token' },
      params: { id: 'ZzY987' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Type'), 'image/png');
    assert.strictEqual(await res.text(), 'telegram-file');
    assert.strictEqual(fetchMock.calls.length, 2);
  });

  it('passes unknown short-format ids through unchanged', async function () {
    const onRequest = await getOnRequest();
    const img_url = createMockKV();

    fetchMock = installFetchMock(async input => {
      assert.strictEqual(String(input), 'https://telegra.ph//file/zzz999');
      return new Response('not-found', { status: 404 });
    });

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/zzz999'),
      env: { img_url, ENABLE_SHORT_URLS: 'true' },
      params: { id: 'zzz999' },
    }));

    assert.strictEqual(res.status, 404);
  });

  it('uses Telegram getFile for long Bot API file ids before proxying content', async function () {
    const onRequest = await getOnRequest();
    const telegramFileId = 'AgACAgEAAxkDAAMDZt1Gzs4W8dQPWiQJxO5YSH5X-gsAAt-sMRuWNelGOSaEM_9lHHgBAAMCAANtAAM2BA';
    const fileName = `${telegramFileId}.png`;
    const img_url = createMockKV({
      [fileName]: baseMetadata,
    });

    fetchMock = installFetchMock(async (input, init, calls) => {
      if (calls.length === 1) {
        assert.strictEqual(String(input), `https://api.telegram.org/botbot-token/getFile?file_id=${telegramFileId}`);
        return Response.json({
          ok: true,
          result: { file_path: 'photos/file_1.png' },
        });
      }

      assert.strictEqual(String(input), 'https://api.telegram.org/file/botbot-token/photos/file_1.png');
      assert.strictEqual(init.method, 'GET');
      return new Response('telegram-file', { status: 200 });
    });

    const res = await onRequest(makeContext({
      request: new Request(`https://example.com/file/${fileName}`),
      env: { img_url, TG_Bot_Token: 'bot-token' },
      params: { id: fileName },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), 'telegram-file');
    assert.strictEqual(fetchMock.calls.length, 2);
  });

  it('skips KV writes for admin referers', async function () {
    const onRequest = await getOnRequest();
    const img_url = createMockKV();
    const headers = new Headers({ Referer: 'https://example.com/admin.html' });

    fetchMock = installFetchMock(async () => new Response('image-body', { status: 200 }));

    const res = await onRequest(makeContext({
      request: new Request('https://example.com/file/cat.png', { headers }),
      env: { img_url },
      params: { id: 'cat.png' },
    }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(await res.text(), 'image-body');
    assert.deepStrictEqual(img_url.operations.get, []);
    assert.deepStrictEqual(img_url.operations.put, []);
  });
});
