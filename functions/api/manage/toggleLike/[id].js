export async function onRequest(context) {
    const { params, env } = context;

    console.log("Request ID:", params.id);

    // 获取元数据
    const value = await env.img_url.getWithMetadata(params.id);
    console.log("Current metadata:", value);

    // 如果记录不存在
    if (!value.metadata) return new Response(`Image metadata not found for ID: ${params.id}`, { status: 404 });

    // 切换 liked 状态并更新
    value.metadata.liked = !value.metadata.liked;
    await env.img_url.put(params.id, "", { metadata: value.metadata });

    console.log("Updated metadata:", value.metadata);

    return new Response(JSON.stringify({ success: true, liked: value.metadata.liked }), {
        headers: { 'Content-Type': 'application/json' },
    });
}
