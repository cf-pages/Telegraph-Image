const assert = require('assert');

describe('locale negotiation', function () {
  async function getModule() {
    return await import('../functions/utils/i18n.js');
  }

  function request(url, headers = {}) {
    return new Request(url, { headers });
  }

  it('defaults to Chinese, preserving the behavior before i18n existed', async function () {
    const { resolveLocale, DEFAULT_LOCALE } = await getModule();

    assert.strictEqual(DEFAULT_LOCALE, 'zh');
    assert.strictEqual(resolveLocale(request('https://example.com/api/config'), {}), 'zh');
  });

  it('honors an explicit ?lang= over everything else', async function () {
    const { resolveLocale } = await getModule();

    const res = resolveLocale(
      request('https://example.com/api/config?lang=en', { 'Accept-Language': 'zh-CN' }),
      { SITE_LANG: 'zh' },
    );

    assert.strictEqual(res, 'en');
  });

  it('uses SITE_LANG as the deployment default over the visitor header', async function () {
    const { resolveLocale } = await getModule();

    const res = resolveLocale(
      request('https://example.com/api/config', { 'Accept-Language': 'zh-CN,zh;q=0.9' }),
      { SITE_LANG: 'en' },
    );

    assert.strictEqual(res, 'en');
  });

  it('negotiates Accept-Language by quality, not by order', async function () {
    const { resolveLocale } = await getModule();

    assert.strictEqual(
      resolveLocale(request('https://example.com/', { 'Accept-Language': 'en-US,en;q=0.9' }), {}),
      'en',
    );
    // fr is unsupported and must be skipped; en outranks zh on q here
    assert.strictEqual(
      resolveLocale(request('https://example.com/', { 'Accept-Language': 'fr,zh;q=0.3,en;q=0.8' }), {}),
      'en',
    );
    assert.strictEqual(
      resolveLocale(request('https://example.com/', { 'Accept-Language': 'zh-Hans-CN,en;q=0.5' }), {}),
      'zh',
    );
  });

  it('ignores q=0 and unsupported languages', async function () {
    const { resolveLocale } = await getModule();

    assert.strictEqual(
      resolveLocale(request('https://example.com/', { 'Accept-Language': 'en;q=0,zh;q=0.4' }), {}),
      'zh',
    );
    assert.strictEqual(
      resolveLocale(request('https://example.com/', { 'Accept-Language': 'de,fr;q=0.8' }), {}),
      'zh',
    );
  });

  it('falls through unsupported ?lang= and SITE_LANG values', async function () {
    const { resolveLocale, normalizeLocale } = await getModule();

    assert.strictEqual(normalizeLocale('klingon'), null);
    assert.strictEqual(normalizeLocale('EN-gb'), 'en');
    assert.strictEqual(
      resolveLocale(request('https://example.com/?lang=klingon', { 'Accept-Language': 'en' }), { SITE_LANG: 'de' }),
      'en',
    );
  });

  it('translates a code in both languages and interpolates params', async function () {
    const { translate } = await getModule();

    const zh = translate('storage-missing-config', { missing: ['TG_Bot_Token'] }, 'zh');
    const en = translate('storage-missing-config', { missing: ['TG_Bot_Token'] }, 'en');

    assert.ok(zh.includes('TG_Bot_Token'));
    assert.ok(en.includes('TG_Bot_Token'));
    assert.notStrictEqual(zh, en);
    assert.ok(!/[一-鿿]/.test(en), 'the English message must not contain Chinese text');
  });

  it('degrades to readable text for an unknown code', async function () {
    const { translate } = await getModule();

    assert.strictEqual(translate('no-such-code', {}, 'en'), 'no-such-code');
  });
});
