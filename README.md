# Telegraph-Image-auth

本项目从[Telegraph-Image](https://github.com/cf-pages/Telegraph-Image) fork而来，并且经过修改，增加前台认证和随机出图脚本，适合放壁纸。

原项目是不错的项目，不过有很大的缺陷，那就是任何人在得到都可以向部署的接口投喂数据，这样会污染图片源，所以要增加一个上传认证，提高污染图片源的难度。

njzzzz的项目本人部署后发现会无限302，不停询问密钥，但是输入后无法正常工作，所以不得不在他的基础上做一些改进。

## 与原项目的区别

除了使用原项目的部署方法，还要额外增加认证码，用来认证上传图片用户的身份信息。

### 一、在环境变量中要增加AUTH_CODE，值为你自定义密钥。

### 二、部署成功后，正常主页无法直接上传图片，会提示未授权，有两种方法可以传递密钥参数。
1、在浏览器中直接访问https://<span></span>yourdomain.page.dev/?autocode=yourpassword，然后在页面上就可以上传图片。

2、使用picgo/piclist，使用插件Telegraph-Image-uploader，因为原版本作者写死了路径，所以无法直接使用，我这边有修改好可用的[插件脚本](https://github.com/maytom2016/picgo-plugin-telegraph-image-auth)，复制到插件目录覆盖原先的js文件，随后，重启picgo/piclist，填写URL参数为https://<span></span>yourdomain.page.dev/yourpassword，保存配置后即可使用。

### 三、增加了新接口，随机返回图片，用来做壁纸时很有用。

https://<span></span>yourdomain.page.dev/randompic

## 注意事项

一、图片本体是存到Telegra.ph，据我所知，传完图片后没有删除的办法，项目采用的删除方法只是从kv的条目中删去图片记录，所以当私有图床做不到的，删去只是你自己看不到，
图片仍然存在telegra.ph中，并且可以公开访问。不信你可以删除一条记录，使用https://<span></span>telegra.ph/file/+被删除记录图片文件名，来看看能否访问，答案不言自明。

二、本人无意对项目进行更多的改进，所以除了项目下的functions/upload.js，randompic.js和[authcode].js，其他文件都没有实质改动，可以高度和原项目兼容，后续只需要保持这三个文件不动，
从原项目就可以拉取最新改进。

## 感谢
### cf-pages
https://github.com/cf-pages/Telegraph-Image
### njzzzz
https://github.com/njzzzz/Telegraph-Image
### secflag
https://github.com/secflag/picgo-plugin-telegraph-image
