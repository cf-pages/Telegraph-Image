//该文件用来处理形如https://a.pages.dev/?authcode=1的请求，这样就可以在前端能过认证的方式上传图片。

function UnauthorizedException(reason) {
  return new Response(reason, {
    status: 401,
    statusText: "Unauthorized",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      // Disables caching by default.
      "Cache-Control": "no-store",
      // Returns the "Content-Length" header for HTTP HEAD requests.
      "Content-Length": reason.length,
    },
  });
}

export async function onRequestPost(context) {  // Contents of context object  
    const {   
     request, // same as existing Worker API    
     env, // same as existing Worker API    
     params, // if filename includes [id] or [[path]]   
     waitUntil, // same as ctx.waitUntil in existing Worker API    
     next, // used for middleware or to fetch assets    
     data, // arbitrary space for passing data between middlewares 
     } = context;
  
    const ref=request.headers.get('Referer');
    const url= new URL(ref)
    const refparam = new URLSearchParams(url.search);
    const autcode=refparam.get('authcode');
    
    if(autcode==env.AUTH_CODE){
     
     const url1=new URL(request.url)
     const url = new URL(url1.protocol + '//' + url1.host + '/upload' + url1.search);

    /*url.pathname对下面拼接字符有关键作用，改了就错，请求就失败了,各种报错，二次开发要特别注意
    目前已经改了向telegra.ph的请求，不管什么路径过来都是/upload，具体原因不太清楚，可能是因为telegra.ph下
    就这个路径负责文件上传，改别的基本都是错误请求。
    */

      const response = fetch('https://telegra.ph/' + url.pathname , {
          method: request.method,
          headers: request.headers,
          body: request.body,
      });
     return response;
     }
     return new UnauthorizedException("error");
  }