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
    //  console.log("requesheader:"+context.request.headers.get('authcode'))
    //  if(request.headers.get('authcode') == env.AUTH_CODE){
    //  console.log(decodeURIComponent(params.authcode))
     /*params.authcode的含义是域名/后面路径当作密钥，picgo使用插件访问方便，如果要网页访问，这个路径会有问题加载不出来，所以又加入参数
     形如/upload?authcode=1*/

    //  const serachparams = new URLSearchParams(url.search);
    //  const qauthcode = params1.get('authcode');

     if (decodeURIComponent(params.authcode) === env.AUTH_CODE){
      // if(qauthcode==env.AUTH_CODE){
    //  context.request
     const url1=new URL(request.url)
     const url = new URL(url1.protocol + '//' + url1.host + '/upload' + url1.search);
    //  console.log("new request url:"+url);
    // console.log("old request url:"+url1.pathname+ url1.search);
    // console.log("new request url:"+url.pathname+ url.search);
    // console.log("new request url:"+url.search);
    /*url.pathname对下面拼接字符有关键作用，改了就错，请求就失败了,各种报错，二次开发要特别注意
    目前已经改了向telegra.ph的请求，不管什么路径过来都是/upload，具体原因不太清楚，可能是因为telegra.ph下
    就这个路径负责文件上传，改别的基本都是错误请求。
    */

     const response = fetch('https://telegra.ph/' + url.pathname , {
         method: request.method,
         headers: request.headers,
         body: request.body,
     });
    //  console.log("pathname:"+url.pathname.toString());
    //  console.log("search:"+url.search.toString());
    //  console.log("env:"+env);
    //  console.log("params.code:"+params.code);

    return response;
     }
     else
     {
      return new UnauthorizedException("error");
     }
  }