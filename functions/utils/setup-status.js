import { isEmptyBinding } from './http.js';
import { DEFAULT_LOCALE, translate } from './i18n.js';

// Deployment self-check. Most support requests about this project are a missing
// binding or an unset variable that only surfaces as a failed upload much later,
// so the homepage asks for this and says what is wrong up front.
//
// Only enum-valued status is reported, never a configured value: the states here
// are already observable by using the site, so publishing them adds no
// information an attacker could not get by trying an upload.

export function getSetupStatus(env, locale = DEFAULT_LOCALE) {
  const storage = storageStatus(env);
  const checks = {
    storage,
    dashboard: env.img_url ? 'ok' : 'unbound',
    moderation: moderationStatus(env),
  };

  return {
    ready: storage.state === 'ok',
    checks: {
      storage: storage.state,
      storageProvider: storage.provider,
      dashboard: checks.dashboard,
      moderation: checks.moderation,
    },
    // Each problem carries its code and params alongside the rendered message,
    // so a frontend can localize on its own instead of displaying our wording.
    problems: problemsFor(storage, checks).map(problem => ({
      ...problem,
      message: translate(problem.code, problem.params, locale),
    })),
  };
}

function storageStatus(env) {
  const provider = (env.STORAGE_PROVIDER || 'telegram').toLowerCase();

  if (provider === 'r2') {
    return {
      provider: 'r2',
      state: env.img_r2 ? 'ok' : 'missing-binding',
      missing: env.img_r2 ? [] : ['img_r2'],
    };
  }

  if (provider !== 'telegram') {
    return { provider, state: 'unknown-provider', missing: ['STORAGE_PROVIDER'] };
  }

  const missing = [];
  if (isEmptyBinding(env.TG_Bot_Token)) missing.push('TG_Bot_Token');
  if (isEmptyBinding(env.TG_Chat_ID)) missing.push('TG_Chat_ID');

  return {
    provider: 'telegram',
    state: missing.length ? 'missing-config' : 'ok',
    missing,
  };
}

function moderationStatus(env) {
  const explicit = (env.MODERATION_PROVIDER || '').toLowerCase();
  if (explicit) {
    if (explicit === 'cloudflare-ai') return env.AI ? 'cloudflare-ai' : 'cloudflare-ai-missing-binding';
    if (explicit === 'moderatecontent') {
      return isEmptyBinding(env.ModerateContentApiKey) ? 'moderatecontent-missing-key' : 'moderatecontent';
    }
    if (explicit === 'none') return 'none';
    return 'unknown-provider';
  }

  if (!isEmptyBinding(env.ModerateContentApiKey)) return 'moderatecontent';
  if (env.AI) return 'cloudflare-ai';
  return 'none';
}

// Problems name the variable or binding to fix and where to set it, because the
// reader is a deploying user looking at their own site, not a developer. The
// wording itself lives in utils/i18n.js; here we only decide what is wrong.
function problemsFor(storage, checks) {
  const problems = [];

  if (storage.state === 'missing-config') {
    problems.push({
      severity: 'error',
      code: 'storage-missing-config',
      params: { missing: storage.missing },
    });
  }

  if (storage.state === 'missing-binding') {
    problems.push({ severity: 'error', code: 'storage-missing-binding', params: {} });
  }

  if (storage.state === 'unknown-provider') {
    problems.push({
      severity: 'error',
      code: 'storage-unknown-provider',
      params: { provider: storage.provider },
    });
  }

  if (checks.dashboard === 'unbound') {
    problems.push({ severity: 'info', code: 'dashboard-unbound', params: {} });
  }

  if (checks.moderation === 'cloudflare-ai-missing-binding') {
    problems.push({ severity: 'warning', code: 'moderation-missing-ai-binding', params: {} });
  }

  if (checks.moderation === 'moderatecontent-missing-key') {
    problems.push({ severity: 'warning', code: 'moderation-missing-key', params: {} });
  }

  if (checks.moderation === 'unknown-provider') {
    problems.push({ severity: 'warning', code: 'moderation-unknown-provider', params: {} });
  }

  return problems;
}
