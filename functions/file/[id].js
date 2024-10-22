export async function onRequest(context) {
    const {
        request,
        env,
        params,
    } = context;

    const url = new URL(request.url);
    const response = await fetch(`https://telegra.ph${url.pathname}${url.search}`, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    // Log response details
    console.log(response.ok, response.status);

    // If the response is OK, proceed with further checks
    if (response.ok) {
        // Allow the admin page to directly view the image
        if (request.headers.get('Referer') === `${url.origin}/admin`) {
            return response;
        }

        // Fetch KV metadata if available
        if (env.img_url) {
            const record = await env.img_url.getWithMetadata(params.id);
            console.log("Record:", record);

            // Ensure metadata exists and add default values for missing properties
            if (record && record.metadata) {
                const metadata = {
                    ListType: record.metadata.ListType || "None",
                    Label: record.metadata.Label || "None",
                    TimeStamp: record.metadata.TimeStamp || Date.now(),
                    liked: record.metadata.liked !== undefined ? record.metadata.liked : false
                };

                // Handle based on ListType and Label
                if (metadata.ListType === "White") {
                    return response;
                } else if (metadata.ListType === "Block" || metadata.Label === "adult") {
                    const referer = request.headers.get('Referer');
                    const redirectUrl = referer ? "https://static-res.pages.dev/teleimage/img-block-compressed.png" : `${url.origin}/block-img.html`;
                    return Response.redirect(redirectUrl, 302);
                }

                // Check if WhiteList_Mode is enabled
                if (env.WhiteList_Mode === "true") {
                    return Response.redirect(`${url.origin}/whitelist-on.html`, 302);
                }
            } else {
                // If metadata does not exist, initialize it in KV with default values
                await env.img_url.put(params.id, "", {
                    metadata: { ListType: "None", Label: "None", TimeStamp: Date.now(), liked: false },
                });
            }
        }

        // If no metadata or further actions required, moderate content and add to KV if needed
        const time = Date.now();
        if (env.ModerateContentApiKey) {
            const moderateResponse = await fetch(`https://api.moderatecontent.com/moderate/?key=${env.ModerateContentApiKey}&url=https://telegra.ph${url.pathname}${url.search}`);
            const moderateData = await moderateResponse.json();
            console.log("Moderate Data:", moderateData);

            if (env.img_url) {
                await env.img_url.put(params.id, "", {
                    metadata: { ListType: "None", Label: moderateData.rating_label, TimeStamp: time, liked: false },
                });
            }

            if (moderateData.rating_label === "adult") {
                return Response.redirect(`${url.origin}/block-img.html`, 302);
            }
        } else if (env.img_url) {
            // Add image to KV with default metadata if ModerateContentApiKey is not available
            console.log("KV not enabled for moderation, adding default metadata.");
            await env.img_url.put(params.id, "", {
                metadata: { ListType: "None", Label: "None", TimeStamp: time, liked: false },
            });
        }
    }

    return response;
}
