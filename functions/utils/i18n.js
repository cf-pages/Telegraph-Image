// Locale negotiation for user-facing API text.
//
// The deployment-facing messages (setup self-check) used to be Chinese-only,
// which left English deployments reading Chinese diagnostics. Resolution order:
//
//   1. ?lang= on the request  - lets a frontend pin a language explicitly
//   2. SITE_LANG              - deployment default, for a single-language site
//   3. Accept-Language        - the visitor's own preference
//   4. DEFAULT_LOCALE         - zh, preserving the behavior before i18n existed

export const DEFAULT_LOCALE = 'zh';

export function resolveLocale(request, env = {}) {
  const url = safeUrl(request);
  const explicit = url && url.searchParams.get('lang');

  return normalizeLocale(explicit)
    || normalizeLocale(env.SITE_LANG)
    || fromAcceptLanguage(request)
    || DEFAULT_LOCALE;
}

// Accepts 'en', 'EN', 'en-US', 'zh-Hans-CN'; anything unsupported yields null so
// the caller falls through to the next source instead of failing.
export function normalizeLocale(value) {
  if (!value) return null;

  const base = String(value).trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(base) ? base : null;
}

function fromAcceptLanguage(request) {
  const header = request?.headers?.get?.('Accept-Language');
  if (!header) return null;

  // "zh-CN,zh;q=0.9,en;q=0.8" -> highest-q supported language wins. Entries
  // without q default to 1.0 per RFC 9110.
  const candidates = String(header)
    .split(',')
    .map(part => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find(param => /^\s*q=[0-9.]+\s*$/i.test(param));

      return {
        locale: normalizeLocale(tag),
        quality: qParam ? parseFloat(qParam.split('=')[1]) : 1,
      };
    })
    .filter(candidate => candidate.locale && candidate.quality > 0)
    // Array.prototype.sort is stable, so equal q values keep header order.
    .sort((a, b) => b.quality - a.quality);

  return candidates.length ? candidates[0].locale : null;
}

function safeUrl(request) {
  try {
    return new URL(request.url);
  } catch {
    return null;
  }
}

// Message catalogs are keyed by code so callers pass structured data and the
// wording lives in one place per language.
const MESSAGES = {
  zh: {
    'storage-missing-config': ({ missing }) =>
      `上传不可用：缺少环境变量 ${missing.join('、')}。请在 Cloudflare Pages 项目的「设置 → 环境变量」中添加，然后重新部署。`,
    'storage-missing-binding': () =>
      '上传不可用：STORAGE_PROVIDER=r2 但没有绑定名为 img_r2 的 R2 存储桶。请在「设置 → 函数 → R2 存储桶绑定」中添加，然后重新部署。',
    'storage-unknown-provider': ({ provider }) =>
      `上传不可用：STORAGE_PROVIDER 的值 "${provider}" 无法识别，可用值为 telegram 或 r2。`,
    'dashboard-unbound': () =>
      '后台图片管理未启用：需要绑定名为 img_url 的 KV 命名空间（「设置 → 函数 → KV 命名空间绑定」）。短链接功能也依赖该绑定。',
    'moderation-missing-ai-binding': () =>
      '图片审查未生效：MODERATION_PROVIDER=cloudflare-ai 但没有绑定 Workers AI（变量名 AI）。',
    'moderation-missing-key': () =>
      '图片审查未生效：MODERATION_PROVIDER=moderatecontent 但没有设置 ModerateContentApiKey。该服务已停止新用户注册，建议改用 Workers AI。',
    'moderation-unknown-provider': () =>
      'MODERATION_PROVIDER 的值无法识别，审查已按 none 处理。可用值为 cloudflare-ai、moderatecontent、none。',
  },
  en: {
    'storage-missing-config': ({ missing }) => {
      const many = missing.length > 1;
      return `Uploads are unavailable: the environment variable${many ? 's' : ''} ${missing.join(' and ')} ${many ? 'are' : 'is'} not set. Add ${many ? 'them' : 'it'} under Settings -> Environment Variables in your Cloudflare Pages project, then redeploy.`;
    },
    'storage-missing-binding': () =>
      'Uploads are unavailable: STORAGE_PROVIDER=r2 but no R2 bucket is bound as img_r2. Add the binding under Settings -> Functions -> R2 bucket bindings, then redeploy.',
    'storage-unknown-provider': ({ provider }) =>
      `Uploads are unavailable: STORAGE_PROVIDER value "${provider}" is not recognized. Use telegram or r2.`,
    'dashboard-unbound': () =>
      'The image management dashboard is off: bind a KV namespace as img_url (Settings -> Functions -> KV namespace bindings). Short links need this binding too.',
    'moderation-missing-ai-binding': () =>
      'Image review is inactive: MODERATION_PROVIDER=cloudflare-ai but Workers AI is not bound (variable name AI).',
    'moderation-missing-key': () =>
      'Image review is inactive: MODERATION_PROVIDER=moderatecontent but ModerateContentApiKey is not set. That service no longer accepts new registrations — use Workers AI instead.',
    'moderation-unknown-provider': () =>
      'MODERATION_PROVIDER is not recognized, so review is treated as none. Use cloudflare-ai, moderatecontent, or none.',
  },
};

// The catalog keys are the supported locales, so adding a language is one edit
// here rather than a list that can drift out of step with the wording.
export const SUPPORTED_LOCALES = Object.keys(MESSAGES);

// Falls back to the default locale, then to the code itself, so an untranslated
// entry degrades to readable text instead of "undefined".
export function translate(code, params = {}, locale = DEFAULT_LOCALE) {
  const catalog = MESSAGES[locale] || MESSAGES[DEFAULT_LOCALE];
  const template = catalog[code] || MESSAGES[DEFAULT_LOCALE][code];

  return template ? template(params) : code;
}
