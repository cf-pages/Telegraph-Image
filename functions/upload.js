export async function onRequestPost(context) {
    const { request } = context;
    const url = new URL(request.url);

    // 打印调试信息到控制台
    console.log("Original request URL:", request.url);
    console.log("Transformed URL:", 'https://telegra.ph' + url.pathname + url.search);
    console.log("Request method:", request.method);
    console.log("Request headers:", JSON.stringify([...request.headers]));

    try {
        const response = await fetch('https://telegra.ph' + url.pathname + url.search, {
            method: request.method,
            headers: request.headers,
            body: request.body,
        });

        // 打印响应状态和部分内容
        console.log("Response status:", response.status);
        const responseBody = await response.clone().text();
        console.log("Response body preview:", responseBody.slice(0, 500)); // 预览响应体前500个字符

        return response;
    } catch (error) {
        // 打印错误信息
        console.error("Error during fetch:", error);
        throw error; // 重新抛出错误以便上层处理
    }
}
