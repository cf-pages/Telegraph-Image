import { jsonResponse, textResponse } from "../../../utils/http.js";
import { updateMetadata } from "../../../utils/metadata.js";

export async function onRequest(context) {
    const { params, env } = context;

    const metadata = await updateMetadata(env, params.id, current => {
        current.liked = !current.liked;
        return current;
    });

    if (!metadata) {
        return textResponse(`Image metadata not found for ID: ${params.id}`, { status: 404 });
    }

    return jsonResponse({ success: true, liked: metadata.liked });
}
