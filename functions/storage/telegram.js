import {
    createTelegramFormData,
    deleteTelegramMessage,
    getFileId,
    getMessageId,
    getTelegramFilePath,
    getUploadTarget,
    sendToTelegram,
    validateTelegramConfig,
} from '../utils/telegram.js';

export const telegramProvider = {
    key: 'telegram',

    // Removing the channel message is cleanup, not a guarantee: Telegram may keep
    // serving the file by file_id afterwards, and the message may be gone already
    // (deleted by hand in the channel). Neither should block dropping the record,
    // so a failed delete here is logged rather than fatal.
    bestEffortDelete: true,

    validateConfig(env) {
        validateTelegramConfig(env);
    },

    async upload(env, file, { fileExtension }) {
        const { endpoint, field } = getUploadTarget(file);
        const formData = createTelegramFormData(env.TG_Chat_ID, field, file);

        const result = await sendToTelegram(formData, endpoint, env);
        if (!result.success) {
            throw new Error(result.error);
        }

        const fileId = getFileId(result.data);
        if (!fileId) {
            throw new Error('Failed to get file ID');
        }

        // Persisted so a later delete can remove the channel message; omitted
        // rather than stored as null when Telegram did not report one.
        const messageId = getMessageId(result.data);

        return {
            id: `${fileId}.${fileExtension}`,
            metadata: messageId ? { messageId } : {},
        };
    },

    // Files uploaded before message ids were recorded cannot be deleted from the
    // channel — there is nothing to address the deleteMessage call to.
    canDelete(env, metadata) {
        return Boolean(metadata?.messageId);
    },

    async deleteFile(env, fileId, metadata) {
        await deleteTelegramMessage(env, metadata.messageId);
    },

    async fetchFile(env, request, url, fileId) {
        const fileUrl = await resolveFileUrl(env, url, fileId);
        return fetch(fileUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
        });
    },
};

async function resolveFileUrl(env, url, fileId) {
    // Same threshold as the old `url.pathname.length > 39` check ('/file/' + id):
    // ids longer than 33 characters were uploaded via the Telegram Bot API.
    if (fileId.length > 33) {
        const filePath = await getTelegramFilePath(env, fileId.split('.')[0]);
        return `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
    }

    return 'https://telegra.ph//file/' + fileId + url.search;
}
