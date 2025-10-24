export async function onRequest(context) {
    const {
        request,
        env,
        params,
    } = context;

    const url = new URL(request.url);
    const slugOrFileId = params.id; // 这里的 params.id 可能是短码（slug）或 Telegram file ID

    // ===================================
    // 1. 短链接重定向逻辑
    // 检查 KV 中是否存在短链接映射
    // 我们使用一个明确的前缀 'url_map:' 来区分短链接和图片 KV 记录
    // 注意：短链接不能和图片ID冲突，但由于图片ID很长，冲突概率极低。
    // ===================================
    if (env.img_url) {
        const shortlinkKey = `url_map:${slugOrFileId}`;
        try {
            const longUrl = await env.img_url.get(shortlinkKey);

            if (longUrl) {
                // 如果找到短链接，执行 302 临时重定向
                console.log(`[Shortlink] Redirecting ${slugOrFileId} to ${longUrl}`);

                // *** 可选：在这里添加点击统计逻辑 ***
                // 可以在 metadata 中存储点击次数，每次访问时更新

                return Response.redirect(longUrl, 302);
            }
        } catch (error) {
            console.error('Error checking shortlink:', error);
            // 发生错误，继续执行图片加载逻辑，不影响原功能
        }
    }
    // ===================================
    // 2. 原始图片加载逻辑
    // 如果没有短链接匹配，则认为是图片加载请求。
    // ===================================

    // 原始图片加载逻辑开始
    let fileUrl = 'https://telegra.ph/' + url.pathname + url.search
    if (url.pathname.length > 39) { // Path length > 39 indicates file uploaded via Telegram Bot API
        const formdata = new FormData();
        formdata.append("file_id", url.pathname);

        // ... 省略 requestOptions 的设置 (在下面会删除，因为它未使用) ...

        // /file/AgACAgEAAxkDAAMDZt1Gzs4W8dQPWiQJxO5YSH5X-gsAAt-sMRuWNelGOSaEM_9lHHgBAAMCAANtAAM2BA.png
        // get the AgACAgEAAxkDAAMDZt1Gzs4W8dQPWiQJxO5YSH5X-gsAAt-sMRuWNelGOSaEM_9lHHgBAAMCAANtAAM2BA
        console.log(url.pathname.split(".")[0].split("/")[2])
        const filePath = await getFilePath(env, url.pathname.split(".")[0].split("/")[2]);
        console.log(filePath)
        if (filePath) {
             fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
        } else {
             // 如果获取文件路径失败，可以返回 404 或默认的 Telegraph 链接
             fileUrl = 'https://telegra.ph/' + url.pathname + url.search
        }
    }

    const response = await fetch(fileUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    // If the response is OK, proceed with further checks
    if (!response.ok) return response;

    // Log response details
    console.log(response.ok, response.status);

    // Allow the admin page to directly view the image
    const isAdmin = request.headers.get('Referer')?.includes(`${url.origin}/admin`);
    if (isAdmin) {
        return response;
    }

    // Check if KV storage is available
    if (!env.img_url) {
        console.log("KV storage not available, returning image directly");
        return response;  // Directly return image response, terminate execution
    }

    // The following code executes only if KV is available
    let record = await env.img_url.getWithMetadata(slugOrFileId); // 使用 slugOrFileId 作为 KV 键
    if (!record || !record.metadata) {
        // Initialize metadata if it doesn't exist
        console.log("Metadata not found, initializing...");
        record = {
            metadata: {
                ListType: "None",
                Label: "None",
                TimeStamp: Date.now(),
                liked: false,
                fileName: slugOrFileId,
                fileSize: 0,
            }
        };
        await env.img_url.put(slugOrFileId, "", { metadata: record.metadata });
    }

    const metadata = {
        ListType: record.metadata.ListType || "None",
        Label: record.metadata.Label || "None",
        TimeStamp: record.metadata.TimeStamp || Date.now(),
        liked: record.metadata.liked !== undefined ? record.metadata.liked : false,
        fileName: record.metadata.fileName || slugOrFileId,
        fileSize: record.metadata.fileSize || 0,
    };

    // Handle based on ListType and Label
    if (metadata.ListType === "White") {
        return response;
    } else if (metadata.ListType === "Block" || metadata.Label === "adult") {
        const referer = request.headers.get('Referer');
        const redirectUrl = referer ? "https://static-res.pages.dev/teleimage/img-block-compressed.png" : `${url.origin}/block-img.html`;
        return Response.redirect(redirectUrl, 302);
    }

    // Check if WhiteList_Mode is enabled
    if (env.WhiteList_Mode === "true") {
        return Response.redirect(`${url.origin}/whitelist-on.html`, 302);
    }

    // If no metadata or further actions required, moderate content and add to KV if needed
    if (env.ModerateContentApiKey) {
        try {
            console.log("Starting content moderation...");
            // 注意：Telegraph 链接是硬编码的，如果您的图片来自 Telegram Bot API，这里可能需要调整 URL
            const moderationSourceUrl = fileUrl.startsWith('https://api.telegram.org') ? fileUrl : `https://telegra.ph${url.pathname}${url.search}`;
            
            const moderateUrl = `https://api.moderatecontent.com/moderate/?key=${env.ModerateContentApiKey}&url=${moderationSourceUrl}`;
            const moderateResponse = await fetch(moderateUrl);

            if (!moderateResponse.ok) {
                console.error("Content moderation API request failed: " + moderateResponse.status);
            } else {
                const moderateData = await moderateResponse.json();
                console.log("Content moderation results:", moderateData);

                if (moderateData && moderateData.rating_label) {
                    metadata.Label = moderateData.rating_label;

                    if (moderateData.rating_label === "adult") {
                        console.log("Content marked as adult, saving metadata and redirecting");
                        await env.img_url.put(slugOrFileId, "", { metadata });
                        return Response.redirect(`${url.origin}/block-img.html`, 302);
                    }
                }
            }
        } catch (error) {
            console.error("Error during content moderation: " + error.message);
            // Moderation failure should not affect user experience, continue processing
        }
    }

    // Only save metadata if content is not adult content
    // Adult content cases are already handled above and will not reach this point
    console.log("Saving metadata");
    await env.img_url.put(slugOrFileId, "", { metadata });

    // Return file content
    return response;
}

// 保持原有的 getFilePath 函数不变
async function getFilePath(env, file_id) {
    try {
        const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${file_id}`;
        const res = await fetch(url, {
            method: 'GET',
        });

        if (!res.ok) {
            console.error(`HTTP error! status: ${res.status}`);
            return null;
        }

        const responseData = await res.json();
        const { ok, result } = responseData;

        if (ok && result) {
            return result.file_path;
        } else {
            console.error('Error in response data:', responseData);
            return null;
        }
    } catch (error) {
        console.error('Error fetching file path:', error.message);
        return null;
    }
}
