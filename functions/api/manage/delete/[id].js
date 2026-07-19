import { jsonResponse } from "../../../utils/http.js";
import { getMetadata } from "../../../utils/metadata.js";
import { deleteShortLink } from "../../../utils/shortlink.js";

export async function onRequest(context) {
    const { env, params } = context;

    const metadata = await getMetadata(env, params.id);
    await env.img_url.delete(params.id);

    if (metadata?.shortId) {
        await deleteShortLink(env, metadata.shortId);
    }

    return jsonResponse(params.id);
}
