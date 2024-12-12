export async function onRequest(context) {
    const { params, env } = context;

    console.log("Request ID:", params.id);

    // 获取元数据
    const value = await env.img_url.getWithMetadata(params.id);
    console.log("Current metadata:", value);

    // 如果记录不存在
    if (!value.metadata) return new Response(`Image metadata not found for ID: ${params.id}`, { status: 404 });

    // 更新文件名
    value.metadata.fileName = params.name;
    await env.img_url.put(params.id, "", { metadata: value.metadata });

    console.log("Updated metadata:", value.metadata);

    return new Response(JSON.stringify({ success: true, fileName: value.metadata.fileName }), {
        headers: { 'Content-Type': 'application/json' },
    });
}