import { telegramProvider } from './telegram.js';
import { r2Provider } from './r2.js';

// Storage provider contract:
//   key                                       - tag persisted in KV metadata for provenance
//   validateConfig(env)                       - throws when required bindings/vars are missing
//   upload(env, file, { fileName, fileExtension })
//     -> { id, metadata? } where id is the long file id and metadata holds
//        provider-specific fields to persist (Telegram: the channel message id)
//   fetchFile(env, request, url, fileId)      -> Response with the file body
//   deleteFile(env, fileId, metadata)         - remove the stored file
//   canDelete(env, metadata)                  - false when this deployment could
//     never delete this file (bucket binding removed, or a Telegram file stored
//     before message ids were recorded), so the caller drops the record instead
//     of blocking on something it can never do
//   bestEffortDelete                          - optional; when true a failed
//     delete is logged and the record is still removed, because the stored file
//     costs the deployment nothing and may already be gone
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

// The three delete members above only make sense in one combination, so the
// combining lives here rather than in each caller: remove the stored file before
// its record, drop the record anyway when the provider could never delete the
// file, and only report a retryable failure for providers whose stored bytes
// keep costing the deployment something.
export async function deleteStoredFile(env, fileId, metadata) {
    const provider = getServingProvider(fileId);

    if (!provider.canDelete(env, metadata)) {
        console.error(`Cannot delete ${fileId} from ${provider.key}: nothing to delete against, removing the record only`);
        return { deleted: false, retryable: false };
    }

    try {
        await provider.deleteFile(env, fileId, metadata);
        return { deleted: true, retryable: false };
    } catch (error) {
        console.error(`Failed to delete ${fileId} from ${provider.key}: ${error.message}`);
        return { deleted: false, retryable: !provider.bestEffortDelete, error };
    }
}
