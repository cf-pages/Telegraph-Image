interface Env {
  img_url: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const {
    // request,
    env,
    // params,
    // waitUntil,
    // next,
    // data,
  } = context;
  const img_url_list = env.img_url.list().catch(e => {
    console.log(e);
    return [{"name": "1"},{"name": "2"}];
  });
  const img_url_keys = JSON.stringify((await img_url_list).keys);
  console.log(img_url_keys)
  return new Response(img_url_keys);
};
