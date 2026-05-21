import { isEmptyBinding, textResponse } from "../../utils/http.js";

export async function onRequest(context) {
    if (isEmptyBinding(context.env.BASIC_USER)) {
        return textResponse('Not using basic auth.', { status: 200 });
    }

    return textResponse('true', { status: 200 });
}
