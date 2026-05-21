import {
    basicAuthentication,
    basicAuthChallengeResponse,
    dashboardDisabledResponse,
    unauthorizedResponse,
} from "../../utils/auth.js";
import { isEmptyBinding } from "../../utils/http.js";

async function errorHandling(context) {
    try {
      return await context.next();
    } catch (err) {
      return new Response(`${err.message}\n${err.stack}`, { status: 500 });
    }
  }

  function authentication(context) {
    if (isEmptyBinding(context.env.img_url)) {
        return dashboardDisabledResponse();
    }

    if (isEmptyBinding(context.env.BASIC_USER)) {
        return context.next();
    }

    if (!context.request.headers.has('Authorization')) {
        return basicAuthChallengeResponse();
    }

    const credentials = basicAuthentication(context.request);
    if (credentials instanceof Response) {
        return credentials;
    }

    if (context.env.BASIC_USER !== credentials.user || context.env.BASIC_PASS !== credentials.pass) {
        return unauthorizedResponse('Invalid credentials.');
    }

    return context.next();
  }
  
  export const onRequest = [errorHandling, authentication];
