interface Env {
  img_url: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const {
    request,
    env,
    params,
    waitUntil,
    next,
    data,
  } = context;
  console.log(request, env, params, waitUntil, next, data)
  const img_url_list = env.img_url.list();
  const img_url_keys = JSON.stringify((await img_url_list).keys);
  return new Response(img_url_keys);
};
