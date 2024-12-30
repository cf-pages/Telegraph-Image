interface Env {
  KV: KVNamespace;
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
  let res_data: string = '';
  try {
    const files = formData.getAll('files');

    for (const file of files) {
      const file_name = file['name'];
      const file_extension = file_name.split('.').pop().toLowerCase();
      console.log(file_name, file_extension);

      const telegramFormData = new FormData();
      telegramFormData.append("chat_id", "env['TG_Chat_ID']");

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

      res_data += JSON.stringify(fetch_res);
    }
  } catch (e) {
    res_data += e.toString()
  }

  return new Response(res_data,
    {
      // headers: {'Content-Type': 'text/html'},
      status: 200,
    });
};
