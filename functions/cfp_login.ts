import { CFP_COOKIE_MAX_AGE } from './constants';
import { sha256, getCookieKeyValue } from './utils';

export async function onRequestPost(context: {
  request: Request;
  env: { CFP_PASSWORD?: string };
}): Promise<Response> {
  const { request, env } = context;
  const body = await request.formData();
  const { password, redirect } = Object.fromEntries(body);
  const hashedPassword = await sha256(password.toString());
  const hashedCfpPassword = await sha256(env.CFP_PASSWORD);
  const redirectPath = redirect.toString() || '/';

  if (hashedPassword === hashedCfpPassword) {
    // Valid password. Redirect to home page and set cookie with auth hash.
    const cookieKeyValue = await getCookieKeyValue(env.CFP_PASSWORD);

    return new Response('', {
      status: 302,
      headers: {
        'Set-Cookie': `${cookieKeyValue}; Max-Age=${CFP_COOKIE_MAX_AGE}; Path=/; HttpOnly; Secure`,
        'Cache-Control': 'no-cache',
        Location: redirectPath
      }
    });
  } else {
    // Invalid password. Redirect to login page with error.
    return new Response('', {
      status: 302,
      headers: {
        'Cache-Control': 'no-cache',
        Location: `${redirectPath}?error=1`
      }
    });
  }
}
