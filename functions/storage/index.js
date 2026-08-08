import { telegramProvider } from './telegram.js';
import { r2Provider } from './r2.js';

// Storage provider contract:
//   key                                       - tag persisted in KV metadata for provenance
//   validateConfig(env)                       - throws when required bindings/vars are missing
//   upload(env, file, { fileName, fileExtension, imageUploadMode }) -> long file id (string)
//   fetchFile(env, request, url, fileId)      -> Response with the file body
const PROVIDERS = {
    [telegramProvider.key]: telegramProvider,
    [r2Provider.key]: r2Provider,
};

export function getUploadProvider(env) {
    const name = (env.STORAGE_PROVIDER || telegramProvider.key).toLowerCase();
    const provider = PROVIDERS[name];

    if (!provider) {
        throw new Error(`Unknown STORAGE_PROVIDER: ${env.STORAGE_PROVIDER}`);
    }

    return provider;
}

// Ids are self-describing (R2 ids carry the 'r2-' prefix), so serving does not
// depend on a KV metadata read; ids that predate providers are Telegram/Telegraph.
export function getServingProvider(fileId) {
    if (r2Provider.ownsId(fileId)) {
        return r2Provider;
    }

    return telegramProvider;
}
