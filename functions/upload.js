import { errorHandling, telemetryData } from "./utils/middleware";
export async function onRequestPost(context) {  // Contents of context object  
    const {
        request, // same as existing Worker API    
        env, // same as existing Worker API    
        params, // if filename includes [id] or [[path]]   
        waitUntil, // same as ctx.waitUntil in existing Worker API    
        next, // used for middleware or to fetch assets    
        data, // arbitrary space for passing data between middlewares 
    } = context;
    const clonedRequest = request.clone();
    const formData = await clonedRequest.formData();
    await errorHandling(context);
    telemetryData(context);
    const uploadFile = formData.get('file');
    if (!uploadFile) {
        return new Response('No file uploaded', { status: 400 });
    }

    const fileName = uploadFile.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    const formdata = new FormData();
    formdata.append("chat_id", env.TG_Chat_ID);  
    formdata.append("photo", uploadFile);

    const requestOptions = {
        method: "POST",
        body: formdata,
        redirect: "follow"
    };
    const response = await fetch(`https://api.telegram.org/bot${env.TG_Bot_Token}/sendPhoto`, requestOptions)
    const file = getFile(await response.json());
    if (response.ok) {
        return new Response(
            JSON.stringify([{ 'src': `/file/${file.file_id}.${fileExtension}` }]), 
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }else{
        return response;
    }
}

function getFile(response) {
    try {
        if (!response.ok) {
            return null;
        }

        const getFileDetails = (file) => ({
            file_id: file.file_id,
            file_name: file.file_name || file.file_unique_id
        });

        const fileTypes = ['photo', 'video', 'document'];

        for (const type of fileTypes) {
            if (response.result[type]) {
                if (type === 'photo') {
                    const largestPhoto = response.result.photo.reduce((prev, current) =>
                        (prev.file_size > current.file_size) ? prev : current
                    );
                    return getFileDetails(largestPhoto);
                }
                return getFileDetails(response.result[type]);
            }
        }

        return null;
    } catch (error) {
        console.error('Error getting file id:', error.message);
        return null;
    }
}
