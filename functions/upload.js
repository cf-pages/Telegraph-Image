export async function onRequestPost(context) {
    const { request, env, params, waitUntil, next, data } = context;
    const url = new URL(request.url);

    // 打印调试信息
    console.log("Original request URL:", request.url);
    console.log("Transformed URL:", 'https://telegra.ph' + url.pathname + url.search);
    console.log("Request method:", request.method);
    console.log("Request headers:", JSON.stringify([...request.headers]));

    const response = await fetch('https://telegra.ph' + url.pathname + url.search, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    // 打印响应内容
    const responseBody = await response.text();
    console.log("Response status:", response.status);
    console.log("Response body:", responseBody);

    return new Response(responseBody, {
        status: response.status,
        headers: response.headers
    });
}
