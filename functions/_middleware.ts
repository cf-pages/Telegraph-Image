import sentryPlugin from "@cloudflare/pages-plugin-sentry";

function errorHandling(context) {
  const env = context.env;
  if (typeof env.disable_telemetry == "undefined" || env.disable_telemetry == null || env.disable_telemetry == "") {
    return sentryPlugin({
      dsn: "https://219f636ac7bde5edab2c3e16885cb535@o4507041519108096.ingest.us.sentry.io/4507541492727808",
    })(context);;
  }
  return context.next();
}

function telemetryData(context) {
  const env = context.env;
  if (typeof env.disable_telemetry == "undefined" || env.disable_telemetry == null || env.disable_telemetry == "") {
    const parsedHeaders = {};
    context.request.headers.forEach((value, key) => {
      parsedHeaders[key] = value
    });
    const CF = JSON.parse(JSON.stringify(context.request.cf));
    const parsedCF = {};
    for (const key in CF) {
      if (typeof CF[key] == "object") {
        parsedCF[key] = JSON.stringify(CF[key]);
        console.log(key);
      } else {
        parsedCF[key] = CF[key];
      }
    }
    const data = {
      headers: parsedHeaders,
      cf: parsedCF,
      url: context.request.url,
      method: context.request.method,
      redirect: context.request.redirect,
    }
    context.data.sentry.setContext("request", data);
    context.data.sentry.captureMessage("log", "debug", {
      extra: data,
    });
  }
  return context.next();
}


export const onRequest = [errorHandling, telemetryData];

