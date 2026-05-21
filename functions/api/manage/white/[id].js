import { LIST_TYPE, updateMetadata } from "../../../utils/metadata.js";
import { jsonResponse } from "../../../utils/http.js";

export async function onRequest(context) {
    const { env, params } = context;
    const metadata = await updateMetadata(env, params.id, current => {
        current.ListType = LIST_TYPE.WHITE;
        return current;
    });

    return jsonResponse(metadata);
}
