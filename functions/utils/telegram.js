import { isEmptyBinding } from './http.js';

const MAX_RETRIES = 2;

export function validateTelegramConfig(env) {
  if (isEmptyBinding(env.TG_Bot_Token)) {
    throw new Error('Missing required environment variable: TG_Bot_Token');
  }

  if (isEmptyBinding(env.TG_Chat_ID)) {
    throw new Error('Missing required environment variable: TG_Chat_ID');
  }
}

export function getUploadTarget(file) {
  if (file.type.startsWith('image/')) {
    return { endpoint: 'sendPhoto', field: 'photo' };
  }

  if (file.type.startsWith('audio/')) {
    return { endpoint: 'sendAudio', field: 'audio' };
  }

  if (file.type.startsWith('video/')) {
    return { endpoint: 'sendVideo', field: 'video' };
  }

  return { endpoint: 'sendDocument', field: 'document' };
}

export function createTelegramFormData(chatId, field, file) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append(field, file);
  return formData;
}

export function getFileId(response) {
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

export async function sendToTelegram(formData, apiEndpoint, env, retryCount = 0) {
  const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;

  try {
    const response = await fetch(apiUrl, { method: 'POST', body: formData });
    const responseData = await parseTelegramResponse(response);

    if (response.ok) {
      return { success: true, data: responseData };
    }

    if (retryCount < MAX_RETRIES && apiEndpoint === 'sendPhoto') {
      console.log('Retrying image as document...');
      const newFormData = new FormData();
      newFormData.append('chat_id', formData.get('chat_id'));
      newFormData.append('document', formData.get('photo'));
      return await sendToTelegram(newFormData, 'sendDocument', env, retryCount + 1);
    }

    return {
      success: false,
      error: formatTelegramError(apiEndpoint, response, responseData),
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

async function parseTelegramResponse(response) {
  const contentType = response.headers.get('Content-Type') || '';

  if (contentType.includes('application/json')) {
    return await response.json();
  }

  return { description: await response.text() };
}

function formatTelegramError(apiEndpoint, response, responseData) {
  const details = responseData?.description || responseData?.error_code || 'Upload to Telegram failed';
  return `Telegram ${apiEndpoint} failed: ${response.status} ${details}`;
}

export async function getTelegramFilePath(env, fileId) {
  try {
    const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`;
    const res = await fetch(url, { method: 'GET' });

    if (!res.ok) {
      console.error(`HTTP error! status: ${res.status}`);
      return null;
    }

    const responseData = await res.json();
    const { ok, result } = responseData;

    if (ok && result) {
      return result.file_path;
    }

    console.error('Error in response data:', responseData);
    return null;
  } catch (error) {
    console.error('Error fetching file path:', error.message);
    return null;
  }
}
