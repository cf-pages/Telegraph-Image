export function jsonResponse(data, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function textResponse(body, init = {}) {
  return new Response(body, init);
}

export function isEmptyBinding(value) {
  return typeof value === 'undefined' || value === null || value === '';
}
