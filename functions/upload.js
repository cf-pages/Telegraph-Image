import { errorHandling, telemetryData } from "./utils/middleware";

// ===================================
// 新增哈希函数，用于从长文件ID生成短码
// Cloudflare Workers 内置的 SubtleCrypto API
async function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // 转换为十六进制字符串
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// 从哈希值截取前 N 位作为短码 (Slug)。Base62 转换太复杂，这里直接用Hex截取。
// 6位 Base16 (Hex) 可以提供 16^6 = 16,777,216 个组合
const SLUG_LENGTH = 8; // 使用 8 位 Hex，提供 40 亿+ 组合，足够安全
async function generateShortCodeFromFileId(fileId) {
    const hash = await sha256(fileId);
    return hash.substring(0, SLUG_LENGTH);
}
// ===================================

// 保留原有的 getFileId 和 sendToTelegram 函数（未展示，但假设它们位于文件末尾）

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        await errorHandling(context);
        telemetryData(context);

        const uploadFile = formData.get('file');

        // *** 保持原有的短链接创建逻辑（长URL转短码）不变，这里仅关注图片上传 ***
        const longUrl = formData.get('long_url');
        if (!uploadFile && longUrl) {
            // ... [保持长URL转短码的逻辑不变] ...
            // 假设这里的逻辑已经正确，返回了 short_url
            // 如果您在上一个回复中修改了这里，请保留您修改的逻辑。
            // ----------------------------------------------------
            // 示例：这里应该返回一个 JSON 响应，包含生成的短链接
             let slug;
             // ... [短链接生成逻辑] ...
             const shortUrl = `${new URL(request.url).origin}/file/${slug}`; // 注意这里路径是 /file/slug
             return new Response(
                JSON.stringify({ 
                    success: true,
                    type: 'shortlink',
                    short_url: shortUrl,
                    long_url: longUrl 
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
            // ----------------------------------------------------
        }
        // ------------------------------------

        // 2. 原始图片上传逻辑 (仅在有文件且非短链接时执行)
        if (!uploadFile) {
            throw new Error('No file or long_url uploaded');
        }

        const fileName = uploadFile.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        // [省略 Telegram 上传设置代码，保持不变]
        const telegramFormData = new FormData();
        telegramFormData.append("chat_id", env.TG_Chat_ID);
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

        // =================================================================
        // *** 核心修改部分：生成短码并存储映射 ***

        // 1. 生成短码 (Slug)
        const slug = await generateShortCodeFromFileId(fileId);
        
        // 2. 构造完整的图片访问路径
        const fullImagePath = `/file/${fileId}.${fileExtension}`;

        // 3. 将短码映射到完整的图片访问路径
        if (env.img_url) {
            // 短码 -> 图片完整路径 (用于重定向)
            const shortlinkKey = `url_map:${slug}`;
            await env.img_url.put(shortlinkKey, fullImagePath, {
                metadata: {
                    source: 'image_shortlink',
                    fileId: fileId,
                    extension: fileExtension,
                    // 可以移除 TimeStamp 等信息，如果 KV 限制允许
                }
            });
            // 保持原始的 KV 记录以供管理后台使用
            await env.img_url.put(`${fileId}.${fileExtension}`, "", {
                metadata: {
                    TimeStamp: Date.now(),
                    ListType: "None",
                    Label: "None",
                    liked: false,
                    fileName: fileName,
                    fileSize: uploadFile.size,
                    short_slug: slug, // 可选：记录短码
                }
            });
        }
        // =================================================================

        // 4. 返回短链接
        const shortUrl = `/file/${slug}`;

        return new Response(
            JSON.stringify([{ 'src': shortUrl }]), // 返回短链接
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

// [保持原有的 getFileId 和 sendToTelegram 函数不变]
// 请确保它们在文件中
// ...
// ...
