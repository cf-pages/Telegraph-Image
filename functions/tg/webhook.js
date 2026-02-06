/**
 * Telegram Webhook endpoint
 *
 * Route: POST /tg/webhook
 *
 * Behavior:
 * - Accept photo / image document / video messages sent to the bot
 * - Extract Telegram file_id
 * - Persist a record into KV (img_url) so that /admin can list & manage it
 * - Reply to the sender with the site link: https://<origin>/file/<fileId>.<ext>
 *
 * Security (recommended):
 * - If env.TG_Webhook_Secret is set, verify header `X-Telegram-Bot-Api-Secret-Token`
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // Optional Telegram webhook verification
  // If configured, enforce it.
  const secret = env.TG_Webhook_Secret;
  if (secret) {
    const headerSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (headerSecret !== secret) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const message =
    update?.message ||
    update?.edited_message ||
    update?.channel_post ||
    update?.edited_channel_post;

  // If there's no message payload, still return OK to prevent Telegram retries.
  if (!message) {
    return new Response('OK');
  }

  const chatId = message?.chat?.id;
  if (!chatId) {
    return new Response('OK');
  }

  // Sender allowlist (KV: tg_allowlist)
  // Policy selected by user:
  // 1) message without from.id -> reject silently
  // 2) unauthorized -> reply only in private chat
  const fromId = message?.from?.id;
  if (!fromId) {
    return new Response('OK');
  }

  const isAllowed = await isSenderAllowed(env, fromId);
  if (!isAllowed) {
    if (message?.chat?.type === 'private') {
      await sendMessage(env, chatId, '未授权：你不在上传白名单中。');
    }
    return new Response('OK');
  }

  const origin = new URL(request.url).origin;
  const media = await extractMedia(env, message);

  if (!media) {
    await sendMessage(env, chatId, '请发送图片或视频（photo / document(image) / video）。');
    return new Response('OK');
  }

  const { fileId, ext, fileName, fileSize } = media;
  const key = `${fileId}.${ext}`;
  const fileUrl = `${origin}/file/${key}`;

  // Persist into KV so that /admin can list & manage it.
  if (env.img_url) {
    try {
      await env.img_url.put(key, '', {
        metadata: {
          TimeStamp: Date.now(),
          ListType: 'None',
          Label: 'None',
          liked: false,
          fileName: fileName || key,
          fileSize: Number.isFinite(fileSize) ? fileSize : 0,
        },
      });
    } catch (e) {
      // KV failure should not block giving user the link.
      console.error('KV put failed:', e);
    }
  }

  await sendMessage(env, chatId, `✅ 上传成功\n${fileUrl}`);
  return new Response('OK');
}

/**
 * Extract supported media from a Telegram message.
 * Returns { fileId, ext, fileName, fileSize } or null.
 */
async function extractMedia(env, message) {
  // 1) Photo (compressed) - choose the largest variant
  if (Array.isArray(message.photo) && message.photo.length > 0) {
    const best = pickLargestPhoto(message.photo);
    if (!best?.file_id) return null;

    // Telegram photo is typically jpg. We can improve by calling getFile to infer ext,
    // but defaulting to jpg keeps it fast and works for most cases.
    const ext = 'jpg';
    return {
      fileId: best.file_id,
      ext,
      fileName: `photo.${ext}`,
      fileSize: best.file_size || 0,
    };
  }

  // 2) Document (uncompressed) - often used for images/files
  if (message.document?.file_id) {
    const doc = message.document;
    const mime = (doc.mime_type || '').toLowerCase();

    // Accept images; also allow unknown mime if file_name indicates image extension.
    const fromName = inferExtFromName(doc.file_name);
    const fromMime = inferExtFromMime(mime);

    const looksLikeImage = mime.startsWith('image/') || isImageExt(fromName);
    if (!looksLikeImage) return null;

    const ext = fromName || fromMime || (mime.startsWith('image/') ? mime.split('/')[1] : 'bin');
    return {
      fileId: doc.file_id,
      ext: sanitizeExt(ext),
      fileName: doc.file_name || `document.${ext}`,
      fileSize: doc.file_size || 0,
    };
  }

  // 3) Video
  if (message.video?.file_id) {
    const v = message.video;
    const mime = (v.mime_type || '').toLowerCase();
    const ext = inferExtFromMime(mime) || 'mp4';
    return {
      fileId: v.file_id,
      ext: sanitizeExt(ext),
      fileName: `video.${ext}`,
      fileSize: v.file_size || 0,
    };
  }

  // 4) Video note (round video)
  if (message.video_note?.file_id) {
    const vn = message.video_note;
    // Telegram doesn't provide mime_type for video_note in many cases
    return {
      fileId: vn.file_id,
      ext: 'mp4',
      fileName: 'video_note.mp4',
      fileSize: vn.file_size || 0,
    };
  }

  // 5) Animation (GIF/MP4)
  if (message.animation?.file_id) {
    const a = message.animation;
    const mime = (a.mime_type || '').toLowerCase();
    const ext = inferExtFromName(a.file_name) || inferExtFromMime(mime) || 'mp4';
    return {
      fileId: a.file_id,
      ext: sanitizeExt(ext),
      fileName: a.file_name || `animation.${ext}`,
      fileSize: a.file_size || 0,
    };
  }

  // (Optional) handle audio/voice etc. - not requested
  return null;
}

function pickLargestPhoto(photos) {
  // Choose by file_size if present, otherwise choose the last (often the biggest)
  let best = photos[photos.length - 1];
  for (const p of photos) {
    if ((p.file_size || 0) >= (best.file_size || 0)) best = p;
  }
  return best;
}

function inferExtFromName(fileName) {
  if (!fileName) return null;
  const idx = fileName.lastIndexOf('.');
  if (idx === -1) return null;
  return sanitizeExt(fileName.slice(idx + 1));
}

function inferExtFromMime(mime) {
  if (!mime) return null;
  // common mapping
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/quicktime') return 'mov';
  if (mime === 'video/webm') return 'webm';
  if (mime === 'application/octet-stream') return null;

  // generic fallback like image/* or video/*
  const parts = mime.split('/');
  if (parts.length === 2 && (parts[0] === 'image' || parts[0] === 'video')) {
    return sanitizeExt(parts[1]);
  }
  return null;
}

function sanitizeExt(ext) {
  if (!ext) return 'bin';
  return String(ext).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 10) || 'bin';
}

function isImageExt(ext) {
  if (!ext) return false;
  const e = sanitizeExt(ext);
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'tif', 'tiff', 'avif'].includes(e);
}

async function sendMessage(env, chatId, text) {
  if (!env.TG_Bot_Token) {
    console.error('Missing env.TG_Bot_Token');
    return;
  }

  const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.error('sendMessage failed:', e);
  }
}

async function isSenderAllowed(env, fromId) {
  // If tg_allowlist is not bound, deny for safety.
  if (!env.tg_allowlist) {
    console.warn('KV binding tg_allowlist is missing, deny by default.');
    return false;
  }

  try {
    const v = await env.tg_allowlist.get(String(fromId));
    return v !== null;
  } catch (e) {
    console.error('Allowlist check failed:', e);
    // Fail-closed for safety when allowlist is enabled but check fails
    return false;
  }
}
