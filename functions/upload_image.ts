interface Env {
  img_url: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const {
    request,
    env,
    params,
  } = context;
  console.log(typeof request, typeof env, typeof params);

  // console.log(request)
  const formData: FormData = await request.formData();
  const res_data: string[] = [];
  try {
    const files = formData.getAll('files');
    for (const file of files) {
      const file_name = file['name'];
      const file_extension = file_name.split('.').pop().toLowerCase();
      console.log(file_name, file_extension);

      const telegramFormData = new FormData();
      telegramFormData.append("chat_id", env['TG_Chat_ID']);

      // 根据文件类型选择合适的上传方式
      let apiEndpoint: string;
      let file_type = '';
      if (file['type'].startsWith('image/')) {
        file_type = 'photo';
        apiEndpoint = 'sendPhoto';
      } else {
        file_type = 'document';
        apiEndpoint = 'sendDocument';
      }
      telegramFormData.append(file_type, file);

      const api_url = `https://api.telegram.org/bot${env['TG_Bot_Token']}/${apiEndpoint}`;
      const fetch_res = await fetch(api_url, {method: 'POST', body: telegramFormData});
      const fetch_res_json = await fetch_res.json() as JSON;
      const res_file_id = getFileId(fetch_res_json);
      const img_kv_key = res_file_id + '.' + file_extension;
      await env.img_url.put(img_kv_key, '',{});

      res_data.push("https://image.unrose.com/file/" + img_kv_key);
    }
  } catch (e) {
    res_data.push(e.toString());
  }

  return new Response(JSON.stringify(res_data),
    {
      headers: {'Content-Type': 'text/html'},
      status: 200,
    });
};

function getFileId(message_data: JSON) {
  if (!message_data['ok'] || !message_data['result']) return null;

  const result = message_data['result'];
  if (result.photo) {
    return result.photo.reduce((prev: JSON, current: JSON) =>
      (prev['file_size'] > current['file_size']) ? prev : current
    ).file_id;
  }
  if (result.document) return result.document.file_id;
  if (result.video) return result.video.file_id;

  return null;
}
