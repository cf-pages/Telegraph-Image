export async function onRequest(context) {
    const {
        request,
        env,
        params,
    } = context;

    const url = new URL(request.url);
    let slugOrFileId = params.id; // 这里的 params.id 可能是短码（slug）或完整的 Telegram file ID

    // ===================================
    // 核心修改部分：短链接解析和重写
    // ===================================
    let targetPath = ''; 
    const isShortlink = slugOrFileId.length <= 8; // 假设短码长度 <= 8

    if (env.img_url && isShortlink) {
        const shortlinkKey = `url_map:${slugOrFileId}`;
        try {
            // 查找短码对应的目标路径（完整的 /file/AgAC...）
            const mappedPath = await env.img_url.get(shortlinkKey);

            if (mappedPath) {
                console.log(`[Shortlink] Resolving ${slugOrFileId} to ${mappedPath}`);
                
                // 如果找到，将 URL 路径重写为完整的图片路径
                // 这会将 params.id 设为完整的 fileId.ext，供下面的图片逻辑使用
                targetPath = mappedPath; 
                // 更新 slugOrFileId 以便后续 KV 查找使用完整的图片ID
                slugOrFileId = mappedPath.split('/').pop(); 
            }
        } catch (error) {
            console.error('Error resolving shortlink:', error);
            // 发生错误，继续执行，尝试将 slugOrFileId 视为普通图片ID
        }
    }
    
    // 如果 targetPath 仍然为空，说明不是短链接，或者短链接解析失败。
    // 我们回退到使用原始的 params.id (即完整的 fileId.ext)
    if (!targetPath) {
         targetPath = url.pathname;
    }

    // ===================================
    // 原始图片加载逻辑 (使用 targetPath 或 url.pathname)
    // ===================================
    
    let fileUrl = 'https://telegra.ph/' + targetPath + url.search
    
    // Path length > 39 indicates file uploaded via Telegram Bot API (长的 fileId)
    // 注意：这里的判断逻辑可能需要微调，以适应短码。但由于短码被解析后，我们已经有了长的 fileId，我们可以依赖它。
    if (slugOrFileId.length > 39 && slugOrFileId.includes('.')) { 
        // 提取纯粹的 fileId，不带扩展名
        const rawFileId = slugOrFileId.split(".")[0]; 

        console.log(`Fetching file path for raw ID: ${rawFileId}`);
        const filePath = await getFilePath(env, rawFileId);
        
        if (filePath) {
             fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
        } else {
             console.error(`Failed to get file path for ID: ${rawFileId}`);
             fileUrl = 'https://telegra.ph/' + targetPath + url.search
        }
    }

    const response = await fetch(fileUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    // ... [保持原有的 KV 管理和内容审查逻辑不变] ...
    
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
    // 注意：这里的 KV 键必须是完整的 fileId.ext，而不是短码
    let record = await env.img_url.getWithMetadata(slugOrFileId); 
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
            // 使用最终的 fileUrl 作为审查源
            const moderateUrl = `https://api.moderatecontent.com/moderate/?key=${env.ModerateContentApiKey}&url=${fileUrl}`;
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
        }
    }

    // Only save metadata if content is not adult content
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
