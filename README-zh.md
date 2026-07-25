# Telegraph-Image

免费图片托管解决方案，Flickr/imgur 替代品。基于 Cloudflare Pages，使用 Telegram Bot API 进行图片上传与存储（原 Telegraph 接口已下线）。

[English](README.md)|中文

> [!IMPORTANT]
>
> 由于原有的Telegraph API接口被官方关闭，需要将上传渠道切换至Telegram Channel，请按照文档中的部署要求设置`TG_Bot_Token`和`TG_Chat_ID`，否则将无法正常使用上传功能。

## 目录

- [快速开始](#快速开始)：三步部署一个可用的图床
- [获取 Telegram Bot Token 和 Chat ID](#如何获取telegram的bot_token和chat_id)
- [配置项一览](#配置项一览)：全部环境变量与 KV 绑定
- [功能特性](#功能特性)
- [可选功能开启指南](#可选功能开启指南)：后台管理 / 上传保护 / 短链接 / 图片审查 / 防盗链 / R2 存储 / 站点自定义 / 白名单模式 / 自定义域名
- [API 上传](#api-上传)
- [使用限制与免费额度](#使用限制与免费额度)
- [已经部署了的，如何更新？](#已经部署了的如何更新)
- [常见问题](#常见问题)
- [本地开发与测试](#本地开发与测试)
- [更新日志](#更新日志)

## 快速开始

只需 3 步，即可拥有自己的图床。你唯一需要提前准备的就是一个 Cloudflare 账户（如需在自己的服务器上部署、不依赖 Cloudflare，可参考 [#46](https://github.com/cf-pages/Telegraph-Image/issues/46)）。

1. Fork 本仓库（注意：必须使用 Git 或者 Wrangler 命令行工具部署后才能正常使用，[文档](https://developers.cloudflare.com/pages/functions/get-started/#deploy-your-function)）

2. 打开 Cloudflare Dashboard，进入 Pages 管理页面，选择创建项目，选择`连接到 Git 提供程序`，按照页面提示输入项目名称、选择刚 fork 的仓库，点击`部署站点`

![1](https://telegraph-image.pages.dev/file/8d4ef9b7761a25821d9c2.png)

3. 部署完成后，进入项目的`设置`->`环境变量`，添加 `TG_Bot_Token` 和 `TG_Chat_ID`（获取方法见[下一节](#如何获取telegram的bot_token和chat_id)），保存后进入`部署`页面**重新部署一次**

完成！打开你的 `*.pages.dev` 域名即可上传图片。后台管理、上传保护、短链接等能力见[可选功能开启指南](#可选功能开启指南)。

## 如何获取Telegram的`Bot_Token`和`Chat_ID`

如果您还没有Telegram账户，请先创建一个。接着，按照以下步骤操作以获取`BOT_TOKEN`和`CHAT_ID`：

1. **获取`Bot_Token`**
   - 在Telegram中，向[@BotFather](https://t.me/BotFather)发送命令`/newbot`，根据提示依次输入您的机器人名称和用户名。成功创建机器人后，您将会收到一个`BOT_TOKEN`，用于与Telegram API进行交互。
   
![202409071744569](https://github.com/user-attachments/assets/04f01289-205c-43e0-ba03-d9ab3465e349)

2. **设置机器人为频道管理员**
   - 创建一个新的频道（Channel），进入该频道后，选择频道设置。将刚刚创建的机器人添加为频道管理员，这样机器人才能发送消息。

![202409071758534](https://github.com/user-attachments/assets/cedea4c7-8b31-42e0-98a1-8a72ff69528f)
   
![202409071758796](https://github.com/user-attachments/assets/16393802-17eb-4ae4-a758-f0fdb7aaebc4)


3. **获取`Chat_ID`**
   - 通过[@VersaToolsBot](https://t.me/VersaToolsBot)获取您的频道ID。向该机器人发送消息，按照指示操作，最后您将得到`CHAT_ID`（即频道的ID）。
   - 或者通过[@GetTheirIDBot](https://t.me/GetTheirIDBot)获取您的频道ID。向该机器人发送消息，按照指示操作，最后您将得到`CHAT_ID`（即频道的ID）。

   ![202409071751619](https://github.com/user-attachments/assets/59fe8b20-c969-4d13-8d46-e58c0e8b9e79)

## 配置项一览

所有配置都在 Cloudflare Pages 项目的`设置`中完成。**注意：修改环境变量或 KV 绑定后，需要重新部署才能生效。**

必填环境变量：

| 环境变量        | 示例值                    | 说明                                                                                   |
|-----------------|---------------------------|----------------------------------------------------------------------------------------|
| `TG_Bot_Token`   | `123468:AAxxxGKrn5`        | 从[@BotFather](https://t.me/BotFather)获取的Telegram Bot Token。                        |
| `TG_Chat_ID`     | `-1234567`                 | 频道的ID，确保TG Bot是该频道或群组的管理员。 |

可选环境变量（按需开启对应功能，详见[可选功能开启指南](#可选功能开启指南)）：

| 环境变量        | 示例值                    | 说明                                                                                   |
|-----------------|---------------------------|----------------------------------------------------------------------------------------|
| `BASIC_USER`    | `admin`                   | 后台管理页面（/admin）的登录用户名。不设置则后台无需登录。 |
| `BASIC_PASS`    | `admin-password`          | 后台管理页面的登录密码，需要和 `BASIC_USER` 同时设置。 |
| `UPLOAD_BASIC_USER` | `uploader`             | 上传入口的 Basic Auth 用户名。不设置则保持公开上传。 |
| `UPLOAD_BASIC_PASS` | `strong-password`      | 上传入口的 Basic Auth 密码，需要和 `UPLOAD_BASIC_USER` 同时设置。 |
| `ENABLE_SHORT_URLS` | `true`                 | 开启后（需绑定 KV）上传将返回形如 `/file/AbC123` 的短链接，原有长链接依然有效。 |
| `SHORT_URL_LENGTH`  | `6`                    | 短链接 ID 长度（4-16，默认 6），仅在开启短链接时生效。 |
| `MODERATION_PROVIDER` | `cloudflare-ai`      | 图片审查服务：`cloudflare-ai`（Workers AI，推荐）、`moderatecontent`（旧版）或 `none`。不设置时自动检测：有 `ModerateContentApiKey` 用 moderatecontent，有 `AI` 绑定用 Workers AI。详见[开启图片审查](#开启图片审查)。 |
| `MODERATION_AI_MODEL` | `@cf/meta/llama-3.2-11b-vision-instruct` | `cloudflare-ai` 审查所使用的 Workers AI 模型。不设置时按内置的现役视觉模型降级链依次尝试，Cloudflare 下线某个模型时会自动降级而不是失效。 |
| `CF_ACCOUNT_ID` / `CF_API_TOKEN` | `abc123` / `token` | 可选，两者同时设置即开启**实时模型发现**：审查模型链改为从 Cloudflare 的现役模型目录实时构建（结果在 KV 中缓存 6 小时），已下线的模型自动剔除、新上线的视觉模型自动加入。Token 只需要 "Workers AI: Read" 一项权限。 |
| `ModerateContentApiKey` | `abc123`           | 旧版图片审查，值为 [moderatecontent.com](https://moderatecontent.com/) 的 API key。**该服务已停止新用户注册**，新部署请改用 Workers AI。 |
| `ALLOWED_REFERERS`  | `myblog.com,*.example.com` | 防盗链：允许引用你文件的域名白名单（逗号分隔）。不设置则不限制；空 Referer（直接访问、API 客户端）和你自己的域名始终放行。 |
| `STORAGE_PROVIDER`  | `telegram`             | 上传文件的存储后端：`telegram`（默认）或 `r2`（需绑定 `img_r2`）。每个文件都会记住自己存在哪里，切换后旧文件依然可以正常加载。 |
| `SITE_NAME`         | `My Images`            | 首页顶部显示的站点名称（通过 `GET /api/config` 下发给前端）。 |
| `SITE_TITLE`        | `My Images \| Home`    | 首页的浏览器标签页标题。 |
| `SITE_BACKGROUND`   | `https://.../bg.jpg`   | 首页背景图 URL。 |
| `HIDE_ADMIN_ENTRY`  | `true`                 | 隐藏首页上的后台入口链接（/admin 页面本身仍可访问）。 |
| `WhiteList_Mode`    | `true`                 | 白名单模式：只有加入白名单的图片才能被加载。 |
| `disable_telemetry` | `true`                 | 退出远端遥测。 |

绑定（`设置`->`函数`）：

| 类型 | 变量名称 | 说明 |
| ----------- | ----------- | ----------- |
| KV 命名空间 | `img_url` | 绑定一个提前创建好的 KV 命名空间，即可开启后台图片管理；短链接功能也依赖此绑定 |
| R2 存储桶 | `img_r2` | 绑定一个提前创建好的 R2 存储桶，配合 `STORAGE_PROVIDER=r2` 使用 |
| Workers AI | `AI` | 绑定 Workers AI 即可启用内置图片审查 |

## 功能特性

1.无限图片储存数量，你可以上传不限数量的图片

2.无需购买服务器，托管于 Cloudflare 的网络上，当使用量不超过 Cloudflare 的免费额度时，完全免费

3.无需购买域名，可以使用 Cloudflare Pages 提供的`*.pages.dev`的免费二级域名，同时也支持绑定自定义域名

4.可插拔的图片审查，可根据需要开启——内置支持 Cloudflare Workers AI（无需外部账号）与旧版 moderatecontent.com key，开启后不良图片将自动屏蔽，不再加载

5.支持后台图片管理，可以对上传的图片进行在线预览，添加白名单，黑名单等操作

6.支持图片、视频、音频等多种文件类型，可预览的文件（图片/视频/音频/PDF）直接在浏览器中打开，而不是强制下载

7.支持可选的上传接口密码保护（Basic Auth）与可选的短链接功能，按需通过环境变量开启

8.可插拔的存储后端：文件默认存储在 Telegram，也可通过一个环境变量切换到 Cloudflare R2 存储桶——切换后旧链接依然有效

9.批量上传，支持拖拽和粘贴上传、逐文件进度显示，以及 URL / Markdown / BBCode / HTML 四种格式一键复制；可选的 Referer 白名单防盗链

10.部署自检：配置缺失时首页会直接指出缺哪个环境变量或绑定、去哪里补，而不是等到第一次上传才失败

## 可选功能开启指南

### 后台图片管理

默认关闭。开启方式：在 Cloudflare Pages 后台依次点击`设置`->`函数`->`KV 命名空间绑定`->`编辑绑定`->`变量名称`填写：`img_url`，`KV 命名空间`选择你提前创建好的 KV 储存空间，重新部署后访问 http(s)://你的域名/admin 即可打开后台管理页面

![](https://im.gurl.eu.org/file/a0c212d5dfb61f3652d07.png)
![](https://im.gurl.eu.org/file/48b9316ed018b2cb67cf4.png)

后台支持：图片总数统计、按文件名搜索、分页加载、在线预览、重命名、黑白名单管理、删除记录、网格与瀑布流视图等。各功能的详细说明与截图见[更新日志](#更新日志)。

注意：后台的"删除"只会从列表中移除记录，不会删除 Telegram 上的源文件；如需禁止某个文件加载，请使用黑名单功能。

#### 后台登录验证

默认关闭。如需开启，添加如下环境变量即可：

| 变量名称 | 值 |
| ----------- | ----------- |
| `BASIC_USER` | 后台管理页面登录用户名称 |
| `BASIC_PASS` | 后台管理页面登录用户密码 |

![](https://im.gurl.eu.org/file/dff376498ac87cdb78071.png)

当然你也可以不设置这两个值，这样访问后台管理页面时将无需验证，直接跳过登录步骤，这一设计使得你可以结合 Cloudflare Access 进行使用，实现支持邮件验证码登录，Microsoft 账户登录，Github 账户登录等功能，能够与你域名上原有的登录方式所集成，无需再次记忆多一组后台的账号密码，添加 Cloudflare Access 的方式请参考官方文档，注意需要保护路径包括/admin 以及 /api/manage/\*

### 上传保护

默认公开上传。如果只想保护公开上传入口，可以单独设置 `UPLOAD_BASIC_USER` 和 `UPLOAD_BASIC_PASS`，设置后网页和 API 上传都需要通过 Basic Auth 验证（API 调用方式见 [API 上传](#api-上传)）。这两个变量都不设置时，上传入口会保持公开，以兼容已有部署。

### 短链接

默认关闭。绑定 KV 并设置 `ENABLE_SHORT_URLS=true` 后，上传将返回形如 `/file/AbC123` 的短链接（长度可通过 `SHORT_URL_LENGTH` 调整，4-16 位，默认 6 位），后台的复制按钮也会优先复制短链接。原有长链接不受影响，依然有效。

### 开启图片审查

图片审查为可插拔设计，内置两种审查服务。每个文件只会在首次加载时审查一次，结论（`Label`）会记录在 KV 中，后续加载不再消耗审查额度。审查功能依赖 `img_url` KV 绑定。

**推荐方式：Cloudflare Workers AI（无需注册任何外部服务）**

1. 打开 Pages 项目，依次进入`设置`->`函数`->`Workers AI 绑定`，添加一个变量名称为 `AI` 的绑定
2. 重新部署即可——存在 `AI` 绑定时审查会自动启用（也可以显式设置 `MODERATION_PROVIDER=cloudflare-ai`）

默认使用 Llama 3.2 Vision 模型（`@cf/meta/llama-3.2-11b-vision-instruct`），可通过 `MODERATION_AI_MODEL` 更换。未指定时会按内置降级链依次尝试——即使 Cloudflare 未来下线了首选模型，审查也会自动落到下一个可用模型而不是直接失效；审查服务全部出错时也不会误伤图片（fail-open，出错放行）。Workers AI 有每日免费额度（10,000 neurons/天），由于每个文件只审查一次，一般完全够用。被判定为成人内容的文件会被屏蔽并跳转到拦截页。

**可选：实时模型发现。**`AI` 绑定只能运行模型、不能列出模型，所以模型链的更新通常依赖本仓库升级。如果不想依赖这一点，可以设置 `CF_ACCOUNT_ID` 和 `CF_API_TOKEN`（只需 "Workers AI: Read" 一项权限的 Token）：审查模型链将改为从 Cloudflare 的[现役模型目录](https://developers.cloudflare.com/api/resources/ai/subresources/models/methods/list/)实时构建——超过下线日期的模型自动剔除，当前在服务的视觉模型自动追加。目录结果在 KV 中缓存 6 小时；目录接口不可用时自动退回内置模型链，行为与不配置时一致。

**旧版方式：moderatecontent.com**

> [!WARNING]
> moderatecontent.com 已停止接受新用户注册，此服务仅为已持有可用 API key 的部署保留。另外它只能审查通过旧 Telegraph 通道上传的文件（它需要从 `telegra.ph` 拉取图片），经 Telegram Bot API 上传的文件无法被它审查——请改用 Workers AI。

如果你已有可用的 key，照旧设置 `ModerateContentApiKey` 即可，行为保持不变。如需彻底关闭审查（无视其他配置），设置 `MODERATION_PROVIDER=none`。

### 防盗链

默认关闭。将 `ALLOWED_REFERERS` 设置为允许引用你文件的域名列表（逗号分隔），例如 `myblog.com,*.example.com`（`*.` 前缀会匹配该域名本身及其全部子域名）。来自其他网站的引用请求会收到 `403`。没有 Referer 的请求（浏览器直接访问、curl、原生 App）以及来自你自己域名的请求始终放行，因此开启该功能不会影响直链的正常使用。

### R2 存储

默认文件存储在 Telegram。如需将新上传的文件改存到 Cloudflare R2（没有 20MB 加载限制、没有 Telegram 速率限制，但受 [R2 免费额度](https://developers.cloudflare.com/r2/pricing/)约束）：

1. 创建一个 R2 存储桶，在`设置`->`函数`->`R2 存储桶绑定`中以变量名称 `img_r2` 绑定
2. 设置环境变量 `STORAGE_PROVIDER=r2` 并重新部署

任何时候切换都是安全的：R2 的文件 ID 自带标识（`/file/r2-...`），切换后之前存在 Telegram 的文件依然正常加载，反之亦然。

### 站点自定义

首页加载时会从 `GET /api/config` 读取配置，因此无需修改任何 HTML 即可完成个性化：设置 `SITE_NAME`（顶部站点名）、`SITE_TITLE`（浏览器标签页标题）、`SITE_BACKGROUND`（背景图 URL），以及 `HIDE_ADMIN_ENTRY=true` 隐藏后台入口链接。如果你基于本项目后端自行开发前端，也可以直接使用这个接口。

### 白名单模式

在开启图片管理功能的前提下，设置环境变量 `WhiteList_Mode` 为 `true` 后，只有被添加进白名单的图片才会被加载，上传的图片需要审核通过后才能展示，最大程度的防止不良图片的加载

### 绑定自定义域名

在 pages 的自定义域里面，绑定 cloudflare 中存在的域名，在 cloudflare 托管的域名，自动会修改 dns 记录
![2](https://telegraph-image.pages.dev/file/29546e3a7465a01281ee2.png)

## API 上传

上传接口为 `POST /upload`，使用 `multipart/form-data` 格式，文件字段名为 `file`：

```bash
curl -F "file=@/path/to/image.png" https://your.domain/upload
```

返回一个 JSON 数组，`src` 为文件的访问路径（开启短链接功能后，这里会直接返回短链接）：

```json
[{ "src": "/file/abc123def456.png" }]
```

如果设置了 `UPLOAD_BASIC_USER` 和 `UPLOAD_BASIC_PASS`，请求时需要携带 Basic Auth：

```bash
curl -u uploader:strong-password -F "file=@/path/to/image.png" https://your.domain/upload
```

该接口可配合 PicGo 等支持自定义 Web 图床的上传工具使用。

> [!NOTE]
> 使用 Telegram 存储（默认）时，上传受 Telegram Bot API 速率限制约束：**每个频道约 20 条消息/分钟**。批量上传超过该速率时会开始收到 Telegram 报错——请控制批量上传的节奏，或改用没有此限制的 [R2 存储](#r2-存储)。

## 使用限制与免费额度

1.目前图片文件默认通过 Telegram Bot API 上传并存储于 Telegram，上传单个文件大小受 Telegram Bot API 限制（约 50MB）；但 Bot API 的文件下载接口（getFile）最大仅支持 20MB，超过 20MB 的文件上传后将无法正常加载，因此实际可用的单文件大小请以 20MB 为准。此外 Telegram 对 Bot 有每频道约 20 条消息/分钟的速率限制，会制约持续批量上传的吞吐。改用 [R2 存储](#r2-存储)后这两项限制均不存在

2.由于使用 Cloudflare 的网络，图片的加载速度在某些地区可能得不到保证

3.Cloudflare Function 免费版每日限制 100,000 个请求（即上传或是加载图片的总次数不能超过 100,000 次）如超过可能需要选择购买 Cloudflare Function 的付费套餐

开启图片管理功能后，还会受 Cloudflare KV 免费额度的限制：

- Cloudflare KV 每天只有 1000 次的免费写入额度，每有一张新的图片加载都会占用该写入额度，如果超过该额度，图片管理后台将无法记录新加载的图片
- 每天最多 100,000 次免费读取操作，图片每加载一次都会占用该额度（在没有缓存的情况下，如果你的域名在 Cloudflare 开启了缓存，当缓存未命中时才会占用该额度），超过黑白名单等功能可能会失效
- 每天最多 1,000 次免费删除操作，每有一条图片记录都会占用该额度，超过将无法删除图片记录
- 每天最多 1,000 次免费列出操作，每打开或刷新一次后台/admin 都会占用该额度，超过后将无法正常使用后台图片管理

绝大多数情况下，该免费额度都基本够用，并且可以稍微超出一点，不是已超出就立马停用，且每项额度单独计算，某项操作超出免费额度后只会停用该项操作，不影响其他的功能，即即便我的免费写入额度用完了，我的读写功能不受影响，图片能够正常加载，只是不能在图片管理后台看到新的图片了。

如果你的免费额度不够用，可以自行向 Cloudflare 购买 Cloudflare Workers 的付费版本，每月$5 起步，按量收费，没有上述额度限制

另外针对环境变量所做的更改将在下次部署时生效，如更改了`环境变量`，针对某项功能进行了开启或关闭，请记得重新部署。

![](https://im.gurl.eu.org/file/b514467a4b3be0567a76f.png)

## 已经部署了的，如何更新？

其实更新非常简单，只需要参照更新日志的内容，先进入到 Cloudflare Pages 后台，把需要使用的环境变量提前设置好并绑定上 KV 命名空间，然后去到 Github 你之前 fork 过的仓库依次选择`Sync fork`->`Update branch`即可，稍等一会，Cloudflare Pages 那边检测到你的仓库更新了之后就会自动部署最新的代码了

也可以开启自动同步：fork 之后前往你仓库的 Actions 页面启用 Workflows 并开启 Upstream Sync Action，即可每小时自动与上游同步（详见[更新日志](#更新日志) 2024 年 7 月部分的图文说明）。

## 常见问题

**部署报错 "Missing entry-point to Worker script or to assets directory"**

这是因为项目被当作 Worker 部署了（例如执行了 `wrangler deploy`，或在连接仓库时选择了"Workers"）。本仓库没有 Worker 入口文件，它是一个使用文件路由 Functions 的 **Pages** 项目。请通过 `Workers 和 Pages`->`创建`-> **`Pages`** ->`连接到 Git` 部署，构建命令留空，构建输出目录填 `/`。如使用命令行，对应命令是 `wrangler pages deploy .`，而不是 `wrangler deploy`。

**图片突然无法加载 / 上传开始失败**

请检查 Telegram 速率限制（每频道约 20 条消息/分钟，见 [API 上传](#api-上传)）和 [Cloudflare 免费额度](#使用限制与免费额度)，并确认 `TG_Bot_Token`、`TG_Chat_ID` 设置正确且 Bot 仍是频道管理员。

**修改环境变量后立即生效吗？**

不会——修改环境变量或绑定后，需要前往`部署`页面重新部署一次才会生效。

## 本地开发与测试

```bash
npm install
npm start      # 启动本地开发服务（wrangler pages dev，端口 8080，后台账号密码默认为 admin/123）
npm test       # 运行单元测试（mocha），CI 跑的也是这个
```

**端到端测试**：用 Playwright 驱动真实浏览器，属于可选套件，所以 Playwright 没有列入项目依赖（避免所有贡献者的 `npm install` 都去下载浏览器）。首次运行前需自行安装：

```bash
npm install --no-save playwright && npx playwright install chromium
```

然后在一个终端启动开发服务，另一个终端跑测试。推荐用 `start:r2`，它把存储后端设为本地模拟的 R2，这样整条上传链路无需任何 Telegram 凭据即可跑通：

```bash
npm run start:r2   # 终端 1
npm run test:e2e   # 终端 2
```

端到端测试会覆盖批量上传、拖拽上传、文件取回与 Content-Type、四种格式输出、配置自检提示和后台页面，截图输出在 `test/e2e/output/`。可用环境变量：`E2E_BASE_URL`（默认 http://localhost:8080）、`E2E_CHROMIUM`（指定 Chromium 可执行文件路径，用于无法下载 Playwright 自带浏览器的环境）。

> 后台页面（/admin）从 cdn.jsdelivr.net 加载 Vue 与 Element UI，因此在无法访问该 CDN 的网络环境下会显示空白——端到端测试检测到这种情况会跳过后台检查而不是报失败。

### 感谢

Hostloc @feixiang 和@乌拉擦 提供的思路和代码

## 更新日志
2026 年 7 月 25 日--部署自检与测试基建

- 新增**部署自检**：`GET /api/config` 现在会返回 `ready` 与 `setup` 状态，首页在配置不完整时直接显示需要补哪个环境变量/绑定以及在哪里设置（只返回状态枚举，不回显任何配置值）
- 新增**端到端测试**（`npm run test:e2e`，Playwright 驱动真实浏览器）：覆盖批量上传、拖拽上传、文件取回与 Content-Type、四种输出格式、自检提示与后台页面
- 修正 CI：此前 CI 会额外启动一个 wrangler 开发服务再跑测试，而测试早已不依赖服务器；现在直接运行单元测试，并改用 `npm ci`，同时对 main 的 push 也会触发
- 文档补充端到端测试用法，并说明后台页面依赖 cdn.jsdelivr.net（该 CDN 不可达时后台会空白）

2026 年 7 月 19 日--可插拔存储与审查、全新首页、防盗链

- **图片审查改为可插拔架构**，新增基于 Cloudflare Workers AI 的内置审查（绑定 `AI` 即可，无需任何外部账号）——moderatecontent.com 已停止注册，其对应服务仅为存量 key 保留；审查结论现在会按文件缓存，每个文件至多审查一次（#203/#196/#174/#166/#85/#49）
- **存储改为可插拔架构**：设置 `STORAGE_PROVIDER=r2` 并绑定 `img_r2` R2 存储桶后，新上传的文件存入 Cloudflare R2，摆脱 20MB 加载上限和 Telegram 速率限制；Telegram 仍为默认后端，切换后旧文件照常加载（#181/#118）
- **重写首页为零构建依赖的单文件页面**，支持批量上传、拖拽上传、粘贴上传、逐文件进度显示，以及 URL/Markdown/BBCode/HTML 链接一键复制；旧版 Nuxt 页面保留在 `/index-nuxt.html`（#2/#5/#51/#92/#123/#156/#194）
- **通过环境变量自定义站点**：`SITE_NAME`、`SITE_TITLE`、`SITE_BACKGROUND`、`HIDE_ADMIN_ENTRY`，经由新增的 `GET /api/config` 接口下发，任何自定义前端均可使用（#55/#84/#107/#138/#195）
- **新增防盗链**：`ALLOWED_REFERERS` Referer 白名单，默认关闭、完全向后兼容（#78/#121）
- 文档补充 Telegram 每频道约 20 条消息/分钟的速率限制说明（#245），新增"Missing entry-point"部署报错的常见问题解答（#267）

2026 年 7 月 19 日--上传保护、短链接与预览体验更新

- 新增上传接口的可选 Basic Auth 保护，通过 `UPLOAD_BASIC_USER` 和 `UPLOAD_BASIC_PASS` 开启，感谢 @ytagent 和 @lelouch0823（#278/#279）
- 新增可选短链接功能，通过 `ENABLE_SHORT_URLS` 开启、`SHORT_URL_LENGTH` 配置长度，开启后上传返回形如 `/file/AbC123` 的短链接，后台复制按钮也会优先复制短链，感谢 @wyksean448（#226/#305）
- 图片、视频、音频、PDF 等可预览文件现在直接在浏览器中打开，而不是强制下载（#279）
- 修复通过 Bot API 存储的文件 Content-Type 不正确、导致 GitHub 等场景无法显示图片的问题，感谢 @gynamics（#233/#305）
- 修复后台重命名功能失效的问题，并完成核心函数重构与单元测试覆盖，感谢 @ytagent（#277/#304）
- 后台"删除"操作现在明确为仅删除记录，不会删除 Telegram 上的源文件（#279）

2025 年 8 月 15 日--后台加载性能更新

- 后台图片列表改为分页加载（KV 游标分页 + 加载更多），不再一次性拉取全部记录（#253）
- 后台搜索支持按文件名前缀在服务端过滤（#254）

2024 年 7 月 6 日--后台管理页面更新

- 支持两个新的管理页面视图（网格视图和瀑布流）

    1、网格视图，感谢@DJChanahCJD 提交的代码
        支持批量删除/复制链接
        支持按时间倒序排序
        支持分页功能
        ![](https://camo.githubusercontent.com/a0551aa92f39517f0b30d86883882c1af4c9b3486e540c7750af4dbe707371fa/68747470733a2f2f696d6774632d3369312e70616765732e6465762f66696c652f6262616438336561616630356635333731363237322e706e67)
    2、瀑布流视图，感谢@panther125 提交的代码
        ![](https://camo.githubusercontent.com/63d64491afc5654186248141bd343c363808bf8a77d3b879ffc1b8e57e5ac85d/68747470733a2f2f696d6167652e67696e636f64652e6963752f66696c652f3930346435373737613363306530613936623963642e706e67)

- 添加自动更新支持

    现在fork的项目能够自动和上游仓库同步最新的更改，自动实装最新的项目功能，感谢 @bian2022

    打开自动更新步骤：
        当你 fork 项目之后，由于 Github 的限制，需要手动去你 fork 后的项目的 Actions 页面启用 Workflows，并启用 Upstream Sync Action，启用之后即可开启每小时定时自动更新：
        ![](https://im.gurl.eu.org/file/f27ff07538de656844923.png)
        ![](https://im.gurl.eu.org/file/063b360119211c9b984c0.png)
    `如果你遇到了 Upstream Sync 执行错误，请手动 Sync Fork 一次！`

    手动更新代码

    如果你想让手动立即更新，可以查看 [Github 的文档](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork) 了解如何让 fork 的项目与上游代码同步。

    你可以 star/watch 本项目或者 follow 作者来及时获得新功能更新通知。
- 添加远端遥测

    可通过添加`disable_telemetry`环境变量退出遥测

2023 年 1 月 18 日--图片管理功能更新

1、支持图片管理功能，默认是关闭的，如需开启请部署完成后前往后台依次点击`设置`->`函数`->`KV 命名空间绑定`->`编辑绑定`->`变量名称`填写：`img_url` `KV 命名空间` 选择你提前创建好的 KV 储存空间，开启后访问 http(s)://你的域名/admin 即可打开后台管理页面
| 变量名称 | KV 命名空间 |
| ----------- | ----------- |
| img_url | 选择提前创建好的 KV 储存空间 |

![](https://im.gurl.eu.org/file/a0c212d5dfb61f3652d07.png)
![](https://im.gurl.eu.org/file/48b9316ed018b2cb67cf4.png)

2、后台管理页面新增登录验证功能，默认也是关闭的，如需开启请部署完成后前往后台依次点击`设置`->`环境变量`->`为生产环境定义变量`->`编辑变量` 添加如下表格所示的变量即可开启登录验证
| 变量名称 | 值 |
| ----------- | ----------- |
| `BASIC_USER` | 后台管理页面登录用户名称 |
| `BASIC_PASS` | 后台管理页面登录用户密码 |

![](https://im.gurl.eu.org/file/dff376498ac87cdb78071.png)

当然你也可以不设置这两个值，这样访问后台管理页面时将无需验证，直接跳过登录步骤，这一设计使得你可以结合 Cloudflare Access 进行使用，实现支持邮件验证码登录，Microsoft 账户登录，Github 账户登录等功能，能够与你域名上原有的登录方式所集成，无需再次记忆多一组后台的账号密码，添加 Cloudflare Access 的方式请参考官方文档，注意需要保护路径包括/admin 以及 /api/manage/\*

如果只想保护公开上传入口，也可以单独设置 `UPLOAD_BASIC_USER` 和 `UPLOAD_BASIC_PASS`。这两个变量都不设置时，上传入口会保持公开，以兼容已有部署。

3、新增图片总数量统计
当开启图片管理功能后，可在后台顶部查看记录中的图片数量

![](https://im.gurl.eu.org/file/b7a37c08dc2c504199824.png)

4、新增图片文件名搜索
当开启图片管理功能后，可在后台搜索框使用图片文件名称，快速搜索定位需要管理的图片

![](https://im.gurl.eu.org/file/faf6d59a7d4a48a555491.png)

5、新增图片状态显示
当开启图片管理功能后，可在后台查看图片当前的状态{ "ListType": "None", "TimeStamp": 1673984678274 }
ListType 代表图片当前是否在黑白名单当中，None 则表示既不在黑名单中也不在白名单中，White 表示在在白名单中，Block 表示在黑名单中，TimeStamp 为图片首次加载的时间戳，如开启的图片审查 API，则这里还会显示图片审查的结果用 Label 标识

![](https://im.gurl.eu.org/file/6aab78b83bbd8c249ee29.png)

6、新增黑名单功能
当开启图片管理功能后，可在后台手动为图片加入黑名单，加入黑名单的图片将无法正常加载

![](https://im.gurl.eu.org/file/fb18ef006a23677a52dfe.png)

7、新增白名单功能
当开启图片管理功能后，可在后台手动为图片加入白名单，加入白名单的图片无论如何都会正常加载，可绕过图片审查 API 的结果

![](https://im.gurl.eu.org/file/2193409107d4f2bcd00ee.png)

8、新增记录删除功能
当开启图片管理功能后，可在后台手动删除图片记录。该操作只会从后台列表移除记录，不会删除 Telegraph 或 Telegram 上的源文件。如果后续再次上传并加载该文件，记录可能会再次生成；如需禁止文件加载，请使用上述第 6 点的黑名单功能。

9、新增程序运行模式：白名单模式
当开启图片管理功能后，除了默认模式外，这次更新还新增了一项新的运行模式，在该模式下，只有被添加进白名单的图片才会被加载，上传的图片需要审核通过后才能展示，最大程度的防止不良图片的加载，如需开启请设置环境变量：WhiteList_Mode=="true"

10、新增后台图片预览功能
当开启图片管理功能后，可在后台预览通过你的域名加载过的图片，点击图片可以进行放大，缩小，旋转等操作

![](https://im.gurl.eu.org/file/740cd5a69672de36133a2.png)

### 赞助

本项目由 BrowserStack 提供测试支持。

本项目由 [Cloudflare](https://www.cloudflare.com/) 提供支持。
