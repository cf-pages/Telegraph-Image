interface Env {
  KV: KVNamespace;
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

  return new Response('123' + env['BASIC_USER']);
};
