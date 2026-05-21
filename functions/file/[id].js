import {
    getOrCreateMetadata,
    isBlocked,
    isWhitelisted,
    putMetadata,
} from "../utils/metadata.js";
import { getTelegramFilePath } from "../utils/telegram.js";

export async function onRequest(context) {
    const {
        request,
        env,
        params,
    } = context;

    const url = new URL(request.url);
    const fileUrl = await resolveFileUrl(env, url);

    const response = await fetch(fileUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    // If the response is OK, proceed with further checks
    if (!response.ok) return response;

    // Allow the admin page to directly view the image
    const isAdmin = request.headers.get('Referer')?.includes(`${url.origin}/admin`);
    if (isAdmin) {
        return withInlineDisposition(response, params.id);
    }

    // Check if KV storage is available
    if (!env.img_url) {
        console.log("KV storage not available, returning image directly");
        return withInlineDisposition(response, params.id);  // Directly return image response, terminate execution
    }

    const metadata = await getOrCreateMetadata(env, params.id);

    // Handle based on ListType and Label
    if (isWhitelisted(metadata)) {
        return withInlineDisposition(response, params.id);
    } else if (isBlocked(metadata)) {
        const referer = request.headers.get('Referer');
        const redirectUrl = referer ? "https://static-res.pages.dev/teleimage/img-block-compressed.png" : `${url.origin}/block-img.html`;
        return Response.redirect(redirectUrl, 302);
    }

    // Check if WhiteList_Mode is enabled
    if (env.WhiteList_Mode === "true") {
        return Response.redirect(`${url.origin}/whitelist-on.html`, 302);
    }

    // If no metadata or further actions required, moderate content and add to KV if needed
    const moderationResult = await moderateFile(env, url, metadata);
    if (moderationResult.blocked) {
        await putMetadata(env, params.id, metadata);
        return Response.redirect(`${url.origin}/block-img.html`, 302);
    }

    // Only save metadata if content is not adult content
    // Adult content cases are already handled above and will not reach this point
    await putMetadata(env, params.id, metadata);

    // Return file content
    return withInlineDisposition(response, params.id);
}

async function resolveFileUrl(env, url) {
    let fileUrl = 'https://telegra.ph/' + url.pathname + url.search;

    if (url.pathname.length > 39) { // Path length > 39 indicates file uploaded via Telegram Bot API
        const fileId = url.pathname.split(".")[0].split("/")[2];
        const filePath = await getTelegramFilePath(env, fileId);
        fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
    }

    return fileUrl;
}

async function moderateFile(env, url, metadata) {
    if (!env.ModerateContentApiKey) {
        return { blocked: false };
    }

    try {
        const moderateUrl = `https://api.moderatecontent.com/moderate/?key=${env.ModerateContentApiKey}&url=https://telegra.ph${url.pathname}${url.search}`;
        const moderateResponse = await fetch(moderateUrl);

        if (!moderateResponse.ok) {
            console.error("Content moderation API request failed: " + moderateResponse.status);
            return { blocked: false };
        }

        const moderateData = await moderateResponse.json();
        if (moderateData?.rating_label) {
            metadata.Label = moderateData.rating_label;
        }

        return { blocked: isBlocked(metadata) };
    } catch (error) {
        console.error("Error during content moderation: " + error.message);
        return { blocked: false };
    }
}

function withInlineDisposition(response, filename) {
    const contentType = response.headers.get('Content-Type') || '';

    if (!isPreviewableContent(contentType) && !isPreviewableFilename(filename)) {
        return response;
    }

    const headers = new Headers(response.headers);
    headers.set('Content-Disposition', `inline; filename="${escapeFilename(filename)}"`);

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

function isPreviewableContent(contentType) {
    return contentType.startsWith('image/')
        || contentType.startsWith('video/')
        || contentType.startsWith('audio/')
        || contentType.startsWith('application/pdf');
}

function isPreviewableFilename(filename) {
    return /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp|apng|mp4|m4v|mov|webm|ogv|mp3|m4a|ogg|oga|wav|flac|aac|pdf)$/i.test(String(filename));
}

function escapeFilename(filename) {
    return String(filename).replace(/["\\]/g, '_');
}
