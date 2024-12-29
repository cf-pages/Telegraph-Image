import axios, {AxiosResponse} from "axios";

interface Env {
  img_url: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const {request, env,} = context;
  // get file path json
  const path = request.url.split(".")[0].split("/")[2];
  // const url = `https://api.telegram.org/bot${env['TG_Bot_Token']}/getFile?file_id=${path}`;
  console.log(path);
  const url = `https://api.telegram.org/bot8162291976:AAGznGhSV8Pj47IfoEGj6UyQJWKtrB191qg/getFile?file_id=AgACAgUAAyEGAASQv4IqAAMHZ29c4WtA7PjpKtLaCcKvVEDAEjAAAkPBMRssGXhXRD_Nin8nX64BAAMCAAN5AAM2BA`;
  let file_path;
  axios.get(url).then(
    (res: AxiosResponse) => {
      file_path = res.data.file_path;
    }).catch(() => {
    file_path = 'photos/file_5.jpg'
  });

  // get file
  // const file_url = `https://api.telegram.org/file/bot${env['TG_Bot_Token']}/${file_path}`;
  console.log(file_path)
  const file_url = `https://api.telegram.org/file/bot8162291976:AAGznGhSV8Pj47IfoEGj6UyQJWKtrB191qg/photos/file_5.jpg`;

  let res_data;
  await axios.get(file_url,).then(res => res_data = res.data)


  return new Response(new Blob([res_data]), {headers: {'Content-Type': 'image/jpeg','Content-Disposition': 'inline;',}, status: 200});
};
