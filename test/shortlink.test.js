const assert = require('assert');
const { createMockKV } = require('./helpers');

describe('short link utils', function () {
  async function getModule() {
    return await import('../functions/utils/shortlink.js');
  }

  it('uses the default length and clamps SHORT_URL_LENGTH into 4-16', async function () {
    const { shortIdLength } = await getModule();
    assert.strictEqual(shortIdLength({}), 6);
    assert.strictEqual(shortIdLength({ SHORT_URL_LENGTH: '8' }), 8);
    assert.strictEqual(shortIdLength({ SHORT_URL_LENGTH: '2' }), 4);
    assert.strictEqual(shortIdLength({ SHORT_URL_LENGTH: '99' }), 16);
    assert.strictEqual(shortIdLength({ SHORT_URL_LENGTH: 'abc' }), 6);
  });

  it('generates ids of the requested length from the expected alphabet', async function () {
    const { generateShortId } = await getModule();
    const id = generateShortId(6);
    assert.strictEqual(id.length, 6);
    assert.ok(/^[A-Za-z0-9]+$/.test(id));
  });

  it('recognizes short-id shapes and mapping keys', async function () {
    const { looksLikeShortId, isShortLinkKey } = await getModule();
    assert.strictEqual(looksLikeShortId('AbC123'), true);
    assert.strictEqual(looksLikeShortId('cat.png'), false);
    assert.strictEqual(looksLikeShortId('ab'), false);
    assert.strictEqual(isShortLinkKey('short:AbC123'), true);
    assert.strictEqual(isShortLinkKey('cat.png'), false);
  });

  it('retries on collision and returns a free id', async function () {
    const { allocateShortId, putShortLink } = await getModule();
    const img_url = createMockKV();
    await putShortLink({ img_url }, 'AAAAAA', 'cat.png');

    const sequence = ['AAAAAA', 'BBBBBB'];
    const id = await allocateShortId({ img_url }, () => sequence.shift());
    assert.strictEqual(id, 'BBBBBB');
  });

  it('gives up after bounded attempts when every candidate collides', async function () {
    const { allocateShortId, putShortLink } = await getModule();
    const img_url = createMockKV();
    await putShortLink({ img_url }, 'AAAAAA', 'cat.png');

    const id = await allocateShortId({ img_url }, () => 'AAAAAA');
    assert.strictEqual(id, null);
  });

  it('stores, resolves, and deletes mappings through the short: prefix', async function () {
    const { putShortLink, resolveShortId, deleteShortLink } = await getModule();
    const img_url = createMockKV();

    await putShortLink({ img_url }, 'AbC123', 'cat.png');
    assert.strictEqual(await resolveShortId({ img_url }, 'AbC123'), 'cat.png');
    assert.ok(img_url.snapshot('short:AbC123'));

    await deleteShortLink({ img_url }, 'AbC123');
    assert.strictEqual(await resolveShortId({ img_url }, 'AbC123'), null);
  });
});
