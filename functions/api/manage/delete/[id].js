import { jsonResponse } from "../../../utils/http.js";
import { getMetadata } from "../../../utils/metadata.js";
import { deleteShortLink } from "../../../utils/shortlink.js";
import { deleteStoredFile } from "../../../storage/index.js";

export async function onRequest(context) {
    const { env, params } = context;

    const metadata = await getMetadata(env, params.id);

    // Remove the stored file first: dropping only the KV record would leave an R2
    // object unreachable through the dashboard but still billed as stored bytes,
    // or a Telegram channel message for a file nobody can find any more.
    const result = await deleteStoredFile(env, params.id, metadata);

    // R2 objects cost money and are ours to remove, so a failure is retryable and
    // the record stays. A Telegram message costs the deployment nothing and may
    // already be gone, so the record goes either way.
    if (result.retryable) {
        return jsonResponse(
            { error: `Failed to delete the stored file: ${result.error.message}` },
            { status: 500 },
        );
    }

    await Promise.all([
        env.img_url.delete(params.id),
        metadata?.shortId ? deleteShortLink(env, metadata.shortId) : null,
    ]);

    return jsonResponse(params.id);
}
