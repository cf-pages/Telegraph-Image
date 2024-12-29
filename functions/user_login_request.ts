interface Env {
  KV: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const {
    request,
    // env,
    // params,
    // waitUntil,
    // next,
    // data,
  } = context;
  // console.log(request, env, params, waitUntil, next, data)
  if (!request.headers.has('Authorization')) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {'WWW-Authenticate': 'Basic realm="Secure Area", charset="UTF-8'}
    });
  }

  return new Response('success', {headers: {'Cache-Control': 'private, max-age=600', 'Expires': ''}});
};
