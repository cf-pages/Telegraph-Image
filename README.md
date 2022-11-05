# Telegraph-Image
Free Image Hosting solution, Flickr/imgur alternative. Using Cloudflare Pages and Telegraph.

## Deployment

### Preparation
你唯一需要提前准备的就是一个Cloudflare账户

### Step by Step Instruction
简单3步，即可部署本项目，拥有自己的图床

1.下载或是Fork本仓库 ~~(Fork的时候如果能顺手点下旁边的Star就更好了❤)~~

2.打开Cloudflare Dashboard，进入Pages管理页面，选择创建项目，如果在第一步中选择的是fork本仓库，则选择`连接到 Git 提供程序`，如果第一步中选择的是下载本仓库则选择`直接上传`
![1](https://telegraph-image.pages.dev/file/8d4ef9b7761a25821d9c2.png)

3. 按照页面提示输入项目名称，选择需要连接的git仓库（第一步选择的是fork）或是上传刚刚下载的仓库文件（第一步选择的是下载本仓库），点击`部署站点`即可完成部署

## Features
1.无限图片储存数量，你可以上传不限数量的图片

2.无需购买服务器，托管于Cloudflare的网络上，当使用量不超过Cloudflare的免费额度时，完全免费

3.无需购买域名，可以使用Cloudflare Pages提供的`*.pages.dev`的免费二级域名，同时也支持绑定自定义域名

4.支持图片审查API，可根据需要开启，开启后不良图片将自动屏蔽，不再加载

### 绑定自定义域名
在pages的自定义域里面，绑定cloudflare中存在的域名，在cloudflare托管的域名，自动会修改dns记录
![2](https://telegraph-image.pages.dev/file/29546e3a7465a01281ee2.png)

### 开启图片审查
1.请前往https://moderatecontent.com/ 注册并获得一个免费的用于审查图像内容的API key

2.打开Cloudflare Pages的管理页面，依次点击`设置`，`环境变量`，`添加环境变量`

3.添加一个`变量名称`为`ModerateContentApiKey`，`值`为你刚刚第一步获得的`API key`，点击`保存`即可

注意：由于所做的更改将在下次部署时生效，你或许还需要进入`部署`页面，重新部署一下该本项目

开启图片审查后，因为审查需要时间，首次的图片加载将会变得缓慢，之后的图片加载由于存在缓存，并不会受到影响
![3](https://tpic.pages.dev/file/bae511fb116b034ef9c14.png)

### Limitations
1.由于图片文件实际存储于Telegraph，Telegraph限制上传的图片大小最大为5MB

2.由于使用Cloudflare的网络，图片的加载速度在某些地区可能得不到保证

3.Cloudflare Function免费版每日限制100,000个请求（即上传或是加载图片的总次数不能超过100,000次）如超过可能需要选择购买Cloudflare Function的付费套餐

### 感谢
Hostloc @feixiang和@乌拉擦 提供的思路和代码




