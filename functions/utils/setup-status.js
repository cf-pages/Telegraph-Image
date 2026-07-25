import { isEmptyBinding } from './http.js';

// Deployment self-check. Most support requests about this project are a missing
// binding or an unset variable that only surfaces as a failed upload much later,
// so the homepage asks for this and says what is wrong up front.
//
// Only enum-valued status is reported, never a configured value: the states here
// are already observable by using the site, so publishing them adds no
// information an attacker could not get by trying an upload.

export function getSetupStatus(env) {
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
    problems: problemsFor(storage, checks),
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

// Messages name the variable or binding to fix and where to set it, because the
// reader is a deploying user looking at their own site, not a developer.
function problemsFor(storage, checks) {
  const problems = [];

  if (storage.state === 'missing-config') {
    problems.push({
      severity: 'error',
      message: `上传不可用：缺少环境变量 ${storage.missing.join('、')}。请在 Cloudflare Pages 项目的「设置 → 环境变量」中添加，然后重新部署。`,
    });
  }

  if (storage.state === 'missing-binding') {
    problems.push({
      severity: 'error',
      message: '上传不可用：STORAGE_PROVIDER=r2 但没有绑定名为 img_r2 的 R2 存储桶。请在「设置 → 函数 → R2 存储桶绑定」中添加，然后重新部署。',
    });
  }

  if (storage.state === 'unknown-provider') {
    problems.push({
      severity: 'error',
      message: `上传不可用：STORAGE_PROVIDER 的值 "${storage.provider}" 无法识别，可用值为 telegram 或 r2。`,
    });
  }

  if (checks.dashboard === 'unbound') {
    problems.push({
      severity: 'info',
      message: '后台图片管理未启用：需要绑定名为 img_url 的 KV 命名空间（「设置 → 函数 → KV 命名空间绑定」）。短链接功能也依赖该绑定。',
    });
  }

  if (checks.moderation === 'cloudflare-ai-missing-binding') {
    problems.push({
      severity: 'warning',
      message: '图片审查未生效：MODERATION_PROVIDER=cloudflare-ai 但没有绑定 Workers AI（变量名 AI）。',
    });
  }

  if (checks.moderation === 'moderatecontent-missing-key') {
    problems.push({
      severity: 'warning',
      message: '图片审查未生效：MODERATION_PROVIDER=moderatecontent 但没有设置 ModerateContentApiKey。该服务已停止新用户注册，建议改用 Workers AI。',
    });
  }

  if (checks.moderation === 'unknown-provider') {
    problems.push({
      severity: 'warning',
      message: 'MODERATION_PROVIDER 的值无法识别，审查已按 none 处理。可用值为 cloudflare-ai、moderatecontent、none。',
    });
  }

  return problems;
}
