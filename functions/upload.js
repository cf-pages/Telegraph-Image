import { errorHandling, telemetryData } from "./utils/middleware.js";
import { authenticateUploadRequest } from "./utils/auth.js";
import { jsonResponse } from "./utils/http.js";
import { createDefaultMetadata, putMetadata } from "./utils/metadata.js";
import {
    createTelegramFormData,
    getFileId,
    getUploadTarget,
    sendToTelegram,
    validateTelegramConfig,
} from "./utils/telegram.js";

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const authResponse = authenticateUploadRequest(request, env);
        if (authResponse) {
            return authResponse;
        }

        validateTelegramConfig(env);

        const clonedRequest = request.clone();
        const formData = await clonedRequest.formData();

        await errorHandling(context);
        telemetryData(context);

        const uploadFile = formData.get('file');
        if (!uploadFile) {
            throw new Error('No file uploaded');
        }

        const fileName = uploadFile.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        const { endpoint, field } = getUploadTarget(uploadFile);
        const telegramFormData = createTelegramFormData(env.TG_Chat_ID, field, uploadFile);

        const result = await sendToTelegram(telegramFormData, endpoint, env);

        if (!result.success) {
            throw new Error(result.error);
        }

        const fileId = getFileId(result.data);

        if (!fileId) {
            throw new Error('Failed to get file ID');
        }

        // 将文件信息保存到 KV 存储
        if (env.img_url) {
            await putMetadata(env, `${fileId}.${fileExtension}`, createDefaultMetadata(`${fileId}.${fileExtension}`, {
                fileName,
                fileSize: uploadFile.size,
            }));
        }

        return jsonResponse([{ 'src': `/file/${fileId}.${fileExtension}` }]);
    } catch (error) {
        console.error('Upload error:', error);
        return jsonResponse({ error: error.message }, { status: 500 });
    }
}
