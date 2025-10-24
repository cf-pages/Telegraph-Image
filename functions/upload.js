import { errorHandling, telemetryData } from "./utils/middleware";

// ===================================
// 新增短链接辅助函数
// Base62 字符集: 0-9, a-z, A-Z (共 62 个字符)
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function generateUniqueSlug(length) {
    let result = '';
    const charsLength = BASE62_CHARS.length;
    for (let i = 0; i < length; i++) {
        result += BASE62_CHARS.charAt(Math.floor(Math.random() * charsLength));
    }
    return result;
}
// ===================================

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        await errorHandling(context);
        telemetryData(context);

        const uploadFile = formData.get('file');

        // ===================================
        // 1. 短链接创建逻辑
        // 如果没有上传文件，但有 'long_url' 字段，则认为是短链接请求
        const longUrl = formData.get('long_url');
        if (!uploadFile && longUrl) {
            if (!env.img_url) {
                throw new Error('KV storage (img_url) not configured for shortlink.');
            }
            
            // 确保 URL 是有效的
            try {
                new URL(longUrl);
            } catch (e) {
                throw new Error("Invalid URL provided.");
            }

            let slug;
            let isUnique = false;
            let attempts = 0;
            const MAX_ATTEMPTS = 5;

            // 检查是否已存在该长链接的短码（可选优化）
            const searchKey = `url_map_long:${longUrl}`;
            let existingSlug = await env.img_url.get(searchKey);
            
            if (existingSlug) {
                slug = existingSlug;
            } else {
                // 生成并检查唯一的短码
                while (!isUnique && attempts < MAX_ATTEMPTS) {
                    slug = generateUniqueSlug(6); // 生成 6 位 Base62 编码
                    const key = `url_map:${slug}`;
                    
                    const existingLongUrl = await env.img_url.get(key);
                    
                    if (existingLongUrl === null) {
                        isUnique = true;
                        // 存储短码 -> 长链接
                        await env.img_url.put(key, longUrl, { metadata: { source: 'shortlink' } });
                        // 存储长链接 -> 短码 (用于重复检查)
                        await env.img_url.put(searchKey, slug, { metadata: { source: 'shortlink' } });
                    }
                    attempts++;
                }

                if (!isUnique) {
                    throw new Error('Failed to generate a unique shortlink identifier.');
                }
            }
            
            // 构建短链接 URL
            const shortUrl = `${new URL(request.url).origin}/s/${slug}`;

            return new Response(
                JSON.stringify({ 
                    success: true,
                    type: 'shortlink',
                    short_url: shortUrl,
                    long_url: longUrl 
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }
        // ------------------------------------

        // 2. 原始图片上传逻辑 (仅在有文件且非短链接时执行)
        if (!uploadFile) {
            throw new Error('No file or long_url uploaded');
        }

        const fileName = uploadFile.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        const telegramFormData = new FormData();
        telegramFormData.append("chat_id", env.TG_Chat_ID);

        // 根据文件类型选择合适的上传方式
        let apiEndpoint;
        if (uploadFile.type.startsWith('image/')) {
            telegramFormData.append("photo", uploadFile);
            apiEndpoint = 'sendPhoto';
        } else if (uploadFile.type.startsWith('audio/')) {
            telegramFormData.append("audio", uploadFile);
            apiEndpoint = 'sendAudio';
        } else if (uploadFile.type.startsWith('video/')) {
            telegramFormData.append("video", uploadFile);
            apiEndpoint = 'sendVideo';
        } else {
            telegramFormData.append("document", uploadFile);
            apiEndpoint = 'sendDocument';
        }

        const result = await sendToTelegram(telegramFormData, apiEndpoint, env);

        if (!result.success) {
            throw new Error(result.error);
        }

        const fileId = getFileId(result.data);

        if (!fileId) {
            throw new Error('Failed to get file ID');
        }

        // 将文件信息保存到 KV 存储
        if (env.img_url) {
            await env.img_url.put(`${fileId}.${fileExtension}`, "", {
                metadata: {
                    TimeStamp: Date.now(),
                    ListType: "None",
                    Label: "None",
                    liked: false,
                    fileName: fileName,
                    fileSize: uploadFile.size,
                }
            });
        }

        // 这里的返回路径 `/file/` 仍然用于图片加载
        return new Response(
            JSON.stringify([{ 'src': `/file/${fileId}.${fileExtension}` }]),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('Upload error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// 保持原有的 getFileId 和 sendToTelegram 函数不变...

function getFileId(response) {
    if (!response.ok || !response.result) return null;

    const result = response.result;
    if (result.photo) {
        return result.photo.reduce((prev, current) =>
            (prev.file_size > current.file_size) ? prev : current
        ).file_id;
    }
    if (result.document) return result.document.file_id;
    if (result.video) return result.video.file_id;
    if (result.audio) return result.audio.file_id;

    return null;
}

async function sendToTelegram(formData, apiEndpoint, env, retryCount = 0) {
    const MAX_RETRIES = 2;
    const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;

    try {
        const response = await fetch(apiUrl, { method: "POST", body: formData });
        const responseData = await response.json();

        if (response.ok) {
            return { success: true, data: responseData };
        }

        // 图片上传失败时转为文档方式重试
        if (retryCount < MAX_RETRIES && apiEndpoint === 'sendPhoto') {
            console.log('Retrying image as document...');
            const newFormData = new FormData();
            newFormData.append('chat_id', formData.get('chat_id'));
            newFormData.append('document', formData.get('photo'));
            return await sendToTelegram(newFormData, 'sendDocument', env, retryCount + 1);
        }

        return {
            success: false,
            error: responseData.description || 'Upload to Telegram failed'
        };
    } catch (error) {
        console.error('Network error:', error);
        if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return await sendToTelegram(formData, apiEndpoint, env, retryCount + 1);
        }
        return { success: false, error: 'Network error occurred' };
    }
}
