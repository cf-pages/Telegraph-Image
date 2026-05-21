import { jsonResponse } from "../../../utils/http.js";

export async function onRequest(context) {
    const { env, params } = context;
    await env.img_url.delete(params.id);
    return jsonResponse(params.id);
}
