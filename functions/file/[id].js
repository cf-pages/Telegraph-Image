import {
    getOrCreateMetadata,
    isBlocked,
    isWhitelisted,
    putMetadata,
} from "../utils/metadata.js";
import { getTelegramFilePath } from "../utils/telegram.js";
import { isShortUrlsEnabled, looksLikeShortId, resolveShortId } from "../utils/shortlink.js";

export async function onRequest(context) {
    const {
        request,
        env,
        params,
    } = context;

    const url = new URL(request.url);
    const fileId = await resolveRequestedId(env, params.id);
    const fileUrl = await resolveFileUrl(env, url, fileId);

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
        return withFileHeaders(response, fileId);
    }

    // Check if KV storage is available
    if (!env.img_url) {
        console.log("KV storage not available, returning image directly");
        return withFileHeaders(response, fileId);  // Directly return image response, terminate execution
    }

    const metadata = await getOrCreateMetadata(env, fileId);

    // Handle based on ListType and Label
    if (isWhitelisted(metadata)) {
        return withFileHeaders(response, fileId);
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
    const moderationResult = await moderateFile(env, url, fileId, metadata);
    if (moderationResult.blocked) {
        await putMetadata(env, fileId, metadata);
        return Response.redirect(`${url.origin}/block-img.html`, 302);
    }

    // Only save metadata if content is not adult content
    // Adult content cases are already handled above and will not reach this point
    await putMetadata(env, fileId, metadata);

    // Return file content
    return withFileHeaders(response, fileId);
}

// Short ids are resolved before the file URL is built, so short links work for
// Telegraph-stored files as well as Bot API files.
async function resolveRequestedId(env, requestedId) {
    if (!env.img_url || !isShortUrlsEnabled(env) || requestedId.includes('.') || !looksLikeShortId(requestedId)) {
        return requestedId;
    }

    const target = await resolveShortId(env, requestedId);
    return target || requestedId;
}

async function resolveFileUrl(env, url, fileId) {
    // Same threshold as the old `url.pathname.length > 39` check ('/file/' + id):
    // ids longer than 33 characters were uploaded via the Telegram Bot API.
    if (fileId.length > 33) {
        const filePath = await getTelegramFilePath(env, fileId.split(".")[0]);
        return `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
    }

    return 'https://telegra.ph//file/' + fileId + url.search;
}

async function moderateFile(env, url, fileId, metadata) {
    if (!env.ModerateContentApiKey) {
        return { blocked: false };
    }

    try {
        const moderateUrl = `https://api.moderatecontent.com/moderate/?key=${env.ModerateContentApiKey}&url=https://telegra.ph/file/${fileId}${url.search}`;
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

function withFileHeaders(response, filename) {
    const upstreamType = response.headers.get('Content-Type') || '';
    const correctedType = isUsableContentType(upstreamType) ? null : contentTypeFromFilename(filename);
    const effectiveType = correctedType || upstreamType;
    const inline = isPreviewableContent(effectiveType) || isPreviewableFilename(filename);

    if (!correctedType && !inline) {
        return response;
    }

    const headers = new Headers(response.headers);
    if (correctedType) {
        headers.set('Content-Type', correctedType);
    }
    if (inline) {
        headers.set('Content-Disposition', `inline; filename="${escapeFilename(filename)}"`);
    }

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

function isUsableContentType(contentType) {
    return contentType !== '' && !contentType.startsWith('application/octet-stream');
}

// svg is deliberately absent: serving user uploads as image/svg+xml would allow
// stored XSS on the deployment's own origin.
const CONTENT_TYPES_BY_EXTENSION = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    apng: 'image/apng',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    mp4: 'video/mp4',
    m4v: 'video/x-m4v',
    mov: 'video/quicktime',
    webm: 'video/webm',
    ogv: 'video/ogg',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    aac: 'audio/aac',
    pdf: 'application/pdf',
};

function contentTypeFromFilename(filename) {
    const extension = String(filename).split('.').pop().toLowerCase();
    return CONTENT_TYPES_BY_EXTENSION[extension] || null;
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
