const assert = require('assert');
const { makeContext } = require('./helpers');

describe('/api/config endpoint', function () {
  it('returns defaults when nothing is configured', async function () {
    const { onRequestGet } = await import('../functions/api/config.js');
    const res = await onRequestGet(makeContext({ env: {} }));

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Type'), 'application/json');
    const body = JSON.parse(await res.text());
    const { ready, setup, problems, ...site } = body;

    assert.deepStrictEqual(site, {
      siteName: 'Telegraph-Image',
      siteTitle: 'Telegraph-Image | 免费图床',
      backgroundImage: '',
      enableShortUrls: false,
      uploadRequiresAuth: false,
      showAdminEntry: true,
    });

    // an empty env is not a usable deployment, and the response says why
    assert.strictEqual(ready, false);
    assert.strictEqual(setup.storage, 'missing-config');
    assert.ok(problems.some(p => p.severity === 'error'));
  });

  it('reflects site customization variables', async function () {
    const { onRequestGet } = await import('../functions/api/config.js');
    const res = await onRequestGet(makeContext({
      env: {
        SITE_NAME: 'My Images',
        SITE_TITLE: 'My Images | Home',
        SITE_BACKGROUND: 'https://example.com/bg.jpg',
        ENABLE_SHORT_URLS: 'true',
        UPLOAD_BASIC_USER: 'user',
        UPLOAD_BASIC_PASS: 'pass',
        HIDE_ADMIN_ENTRY: 'true',
      },
    }));

    const { ready, setup, problems, ...site } = JSON.parse(await res.text());

    assert.deepStrictEqual(site, {
      siteName: 'My Images',
      siteTitle: 'My Images | Home',
      backgroundImage: 'https://example.com/bg.jpg',
      enableShortUrls: true,
      uploadRequiresAuth: true,
      showAdminEntry: false,
    });
    assert.ok(setup, 'setup status is always present');
    assert.ok(Array.isArray(problems));
    assert.strictEqual(typeof ready, 'boolean');
  });

  it('reports a ready deployment with no problems', async function () {
    const { onRequestGet } = await import('../functions/api/config.js');
    const res = await onRequestGet(makeContext({
      env: { TG_Bot_Token: 'token', TG_Chat_ID: '-100', img_url: {} },
    }));

    const body = JSON.parse(await res.text());
    assert.strictEqual(body.ready, true);
    assert.deepStrictEqual(body.problems, []);
    assert.strictEqual(body.setup.storageProvider, 'telegram');
  });

  it('never leaks unrelated environment variables', async function () {
    const { onRequestGet } = await import('../functions/api/config.js');
    const res = await onRequestGet(makeContext({
      env: {
        TG_Bot_Token: 'secret-token',
        BASIC_PASS: 'secret-pass',
      },
    }));

    const body = await res.text();
    assert.ok(!body.includes('secret-token'));
    assert.ok(!body.includes('secret-pass'));
  });
});
