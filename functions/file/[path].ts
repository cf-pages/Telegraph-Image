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
  // const url = `https://api.telegram.org/bot8162291976:AAHr3lremFwufqIicZidKhQuv0Hn2mgsYfI/getFile?file_id=AgACAgUAAyEGAASQv4IqAAMKZ3Kh6EhK5VFEjObyN5JguC8sVNUAAtPBMRtYJ5hX4jqkjEyov5UBAAMCAAN5AAM2BA`;
  let file_path_data: object;
  let file_path: string;
  await axios.get(get_path_url, {responseType: "json"}).then(
    (res: AxiosResponse) => {
      console.log('res.data', res.data.length);
      file_path_data = res.data
      file_path = res.data.file_path;
    }).catch(() => {
    file_path = 'photos/file_5.jpg'
  });

  // get file
  const file_url = `https://api.telegram.org/file/bot${env['TG_Bot_Token']}/${file_path}`;
  console.log('file_path', file_url)
  // const file_url = `https://api.telegram.org/file/bot8162291976:AAGznGhSV8Pj47IfoEGj6UyQJWKtrB191qg/photos/file_5.jpg`;
  // const file_url = `https://www.bing.com/th?id=OHR.BorobudurBells_ROW9657189052_1920x1080.webp&qlt=50`;

  let res_data: ArrayBuffer | string;
  let res_data_headers: HeadersInit;
  await axios.get(file_url, {responseType: 'arraybuffer'})
    .then(res => {
        res_data_headers = {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': 'inline',
        }
        res_data = res.data
      }
    ).catch((e) => {
      res_data_headers = {
        'Content-Type': 'text/html',
      }
      res_data = e.toString() + '/' + file_path + '/' + JSON.stringify(file_path_data);
    });

  return new Response(res_data,
    {
      headers: res_data_headers,
      status: 200
    });
};
