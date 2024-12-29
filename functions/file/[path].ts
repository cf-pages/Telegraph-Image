import axios, {AxiosResponse} from "axios";

interface Env {
  img_url: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const {request, env,} = context;
  // get file path json
  const url = new URL(request.url);
  const path = url.pathname.split(".")[0].split("/")[2];
  console.log('path', path);
  const get_path_url = `https://api.telegram.org/bot${env['TG_Bot_Token']}/getFile?file_id=${path}`;
  console.log('get_path_url', get_path_url);
  // const url = `https://api.telegram.org/bot8162291976:AAGznGhSV8Pj47IfoEGj6UyQJWKtrB191qg/getFile?file_id=AgACAgUAAyEGAASQv4IqAAMHZ29c4WtA7PjpKtLaCcKvVEDAEjAAAkPBMRssGXhXRD_Nin8nX64BAAMCAAN5AAM2BA`;
  let file_path;
  axios.get(get_path_url).then(
    (res: AxiosResponse) => {
      console.log('res.data',res.data);
      file_path = res.data.file_path;
    }).catch(() => {
    file_path = 'photos/file_5.jpg'
  });

  // get file
  const file_url = `https://api.telegram.org/file/bot${env['TG_Bot_Token']}/${file_path}`;
  console.log('file_path',file_path)
  // const file_url = `https://api.telegram.org/file/bot8162291976:AAGznGhSV8Pj47IfoEGj6UyQJWKtrB191qg/photos/file_5.jpg`;

  let res_data;
  await axios.get(file_url, {responseType: 'blob'}).then(res => res_data = res.data)

  return new Response(res_data,
    {
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Type': 'application/octet-stream',
      },
      status: 200
    });
};
