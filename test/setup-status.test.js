const assert = require('assert');

describe('deployment setup status', function () {
  async function getModule() {
    return await import('../functions/utils/setup-status.js');
  }

  it('reports ready when Telegram storage is fully configured', async function () {
    const { getSetupStatus } = await getModule();
    const status = getSetupStatus({ TG_Bot_Token: 'token', TG_Chat_ID: '-100', img_url: {} });

    assert.strictEqual(status.ready, true);
    assert.strictEqual(status.checks.storage, 'ok');
    assert.strictEqual(status.checks.storageProvider, 'telegram');
    assert.strictEqual(status.checks.dashboard, 'ok');
    assert.deepStrictEqual(status.problems, []);
  });

  it('names the missing Telegram variables', async function () {
    const { getSetupStatus } = await getModule();
    const status = getSetupStatus({});

    assert.strictEqual(status.ready, false);
    assert.strictEqual(status.checks.storage, 'missing-config');
    const error = status.problems.find(p => p.severity === 'error');
    assert.ok(error, 'expected an error-level problem');
    assert.ok(error.message.includes('TG_Bot_Token'), error.message);
    assert.ok(error.message.includes('TG_Chat_ID'), error.message);
  });

  it('reports only the one Telegram variable that is missing', async function () {
    const { getSetupStatus } = await getModule();
    const status = getSetupStatus({ TG_Bot_Token: 'token' });

    const error = status.problems.find(p => p.severity === 'error');
    assert.ok(error.message.includes('TG_Chat_ID'), error.message);
    assert.ok(!error.message.includes('TG_Bot_Token'), error.message);
  });

  it('flags an r2 provider without its bucket binding', async function () {
    const { getSetupStatus } = await getModule();
    const status = getSetupStatus({ STORAGE_PROVIDER: 'r2' });

    assert.strictEqual(status.ready, false);
    assert.strictEqual(status.checks.storage, 'missing-binding');
    assert.ok(status.problems.some(p => p.severity === 'error' && p.message.includes('img_r2')));
  });

  it('is ready with r2 bound, without needing Telegram variables', async function () {
    const { getSetupStatus } = await getModule();
    const status = getSetupStatus({ STORAGE_PROVIDER: 'r2', img_r2: {} });

    assert.strictEqual(status.ready, true);
    assert.strictEqual(status.checks.storageProvider, 'r2');
  });

  it('rejects an unrecognized storage provider', async function () {
    const { getSetupStatus } = await getModule();
    const status = getSetupStatus({ STORAGE_PROVIDER: 's3' });

    assert.strictEqual(status.ready, false);
    assert.strictEqual(status.checks.storage, 'unknown-provider');
  });

  it('treats an unbound KV namespace as informational, not blocking', async function () {
    const { getSetupStatus } = await getModule();
    const status = getSetupStatus({ TG_Bot_Token: 'token', TG_Chat_ID: '-100' });

    assert.strictEqual(status.ready, true, 'uploads still work without KV');
    assert.strictEqual(status.checks.dashboard, 'unbound');
    assert.ok(status.problems.some(p => p.severity === 'info' && p.message.includes('img_url')));
  });

  it('auto-detects the moderation provider from bindings', async function () {
    const { getSetupStatus } = await getModule();
    const base = { TG_Bot_Token: 't', TG_Chat_ID: '-1', img_url: {} };

    assert.strictEqual(getSetupStatus(base).checks.moderation, 'none');
    assert.strictEqual(getSetupStatus({ ...base, AI: {} }).checks.moderation, 'cloudflare-ai');
    assert.strictEqual(getSetupStatus({ ...base, ModerateContentApiKey: 'k' }).checks.moderation, 'moderatecontent');
  });

  it('warns when a moderation provider is selected but unusable', async function () {
    const { getSetupStatus } = await getModule();
    const base = { TG_Bot_Token: 't', TG_Chat_ID: '-1', img_url: {} };

    const noBinding = getSetupStatus({ ...base, MODERATION_PROVIDER: 'cloudflare-ai' });
    assert.strictEqual(noBinding.checks.moderation, 'cloudflare-ai-missing-binding');
    assert.ok(noBinding.problems.some(p => p.severity === 'warning'));

    const noKey = getSetupStatus({ ...base, MODERATION_PROVIDER: 'moderatecontent' });
    assert.strictEqual(noKey.checks.moderation, 'moderatecontent-missing-key');
    assert.ok(noKey.problems.some(p => p.severity === 'warning'));

    // an unusable moderation provider must not make the deployment "not ready"
    assert.strictEqual(noBinding.ready, true);
  });

  it('never echoes configured secret values into problem messages', async function () {
    const { getSetupStatus } = await getModule();
    const secret = 'super-secret-token-value';
    const status = getSetupStatus({
      TG_Bot_Token: secret,
      ModerateContentApiKey: secret,
      UPLOAD_BASIC_PASS: secret,
      MODERATION_PROVIDER: 'cloudflare-ai',
    });

    const serialized = JSON.stringify(status);
    assert.ok(!serialized.includes(secret), 'setup status must not leak configured values');
  });
});
