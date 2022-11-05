export async function onRequest(context) {  // Contents of context object  
    const {   
        request, // same as existing Worker API    
    env, // same as existing Worker API    
    params, // if filename includes [id] or [[path]]   
     waitUntil, // same as ctx.waitUntil in existing Worker API    
     next, // used for middleware or to fetch assets    
     data, // arbitrary space for passing data between middlewares 
     } = context;
     context.request
     const url = new URL(request.url);

     let apikey=env.ModerateContentApiKey
     if(typeof apikey == "undefined" || apikey == null || apikey == ""){
   
    }else{
        const res = await fetch(`https://api.moderatecontent.com/moderate/?key=`+apikey+`&url=https://telegra.ph/` + url.pathname + url.search);
        const moderate_data = await res.json();
        if (moderate_data.rating_label=="adult"){
            return Response.redirect(url.origin+"/block-img.html", 302)
        }
    }
     
     const response = fetch('https://telegra.ph/' + url.pathname + url.search, {
         method: request.method,
         headers: request.headers,
         body: request.body,
     });
    return response;
  }
  