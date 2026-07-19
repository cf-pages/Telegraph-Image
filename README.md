# Telegraph-Image

Free Image Hosting solution, Flickr/imgur alternative. Using Cloudflare Pages and the Telegram Bot API (Telegram Channel).

English|[中文](README-zh.md)

> [!IMPORTANT]
>
> Since the original Telegraph API interface was closed by the official, you need to switch the upload channel to Telegram Channel. Please set `TG_Bot_Token` and `TG_Chat_ID` according to the deployment requirements in the documentation, otherwise the upload function will not work properly.

## How to Obtain Telegram `Bot_Token` and `Chat_ID`

If you don't have a Telegram account yet, please create one first. Then, follow these steps to get the `BOT_TOKEN` and `CHAT_ID`:

1. **Get the `Bot_Token`**
   - In Telegram, send the command `/newbot` to [@BotFather](https://t.me/BotFather), and follow the prompts to input your bot's name and username. Once successfully created, you will receive a `BOT_TOKEN`, which is used to interact with the Telegram API.

![202409071744569](https://github.com/user-attachments/assets/04f01289-205c-43e0-ba03-d9ab3465e349)

2. **Set the bot as a channel administrator**
   - Create a new channel (Channel), enter the channel and select channel settings. Add the bot you just created as a channel administrator, so it can send messages.

![202409071758534](https://github.com/user-attachments/assets/cedea4c7-8b31-42e0-98a1-8a72ff69528f)

![202409071758796](https://github.com/user-attachments/assets/16393802-17eb-4ae4-a758-f0fdb7aaebc4)


3. **Get the `Chat_ID`**
   - Get your channel ID through [@VersaToolsBot](https://t.me/VersaToolsBot). Send a message to this bot and follow the instructions to receive your `CHAT_ID` (the ID of your channel).
   - Or get your channel ID through [@GetTheirIDBot](https://t.me/GetTheirIDBot). Send a message to this bot and follow the instructions to receive your `CHAT_ID` (the ID of your channel).

   ![202409071751619](https://github.com/user-attachments/assets/59fe8b20-c969-4d13-8d46-e58c0e8b9e79)

Finally, go to the Cloudflare Pages backend to set the relevant environment variables (Note: After modifying environment variables, you need to redeploy for the changes to take effect)
| Environment Variable | Example Value              | Description                                                                            |
|---------------------|---------------------------|----------------------------------------------------------------------------------------|
| `TG_Bot_Token`      | `123468:AAxxxGKrn5`        | Telegram Bot Token obtained from [@BotFather](https://t.me/BotFather).                |
| `TG_Chat_ID`        | `-1234567`                 | Channel ID, ensure the TG Bot is an administrator of the channel or group.           |
| `UPLOAD_BASIC_USER` | `uploader`                | Optional username for protecting the public upload endpoint. Leave unset to keep uploads public. |
| `UPLOAD_BASIC_PASS` | `strong-password`         | Optional password for protecting the public upload endpoint. Must be set together with `UPLOAD_BASIC_USER`. |
| `ENABLE_SHORT_URLS` | `true`                    | Optional. When enabled (and a KV namespace is bound), uploads return a short link like `/file/AbC123` instead of the long file name. Existing long links keep working. |
| `SHORT_URL_LENGTH`  | `6`                       | Optional. Length of generated short ids (4-16, default 6). Only used when `ENABLE_SHORT_URLS` is on. |

## How to Deploy

### Preparation

The only thing you need to prepare in advance is a Cloudflare account (If you need to deploy on your own server without relying on Cloudflare, please refer to [#46](https://github.com/cf-pages/Telegraph-Image/issues/46))

### Step by Step Tutorial

3 simple steps to deploy this project and have your own image hosting

1. Fork this repository (Note: You must deploy using Git or Wrangler CLI tool for it to work properly, [Documentation](https://developers.cloudflare.com/pages/functions/get-started/#deploy-your-function))

2. Open the Cloudflare Dashboard, enter the Pages management page, select Create Project, then choose `Connect to Git provider`

![1](https://telegraph-image.pages.dev/file/8d4ef9b7761a25821d9c2.png)

3. Follow the prompts on the page to enter the project name, select the git repository you need to connect to, then click `Deploy site` to complete the deployment

## Features

1. Unlimited image storage, you can upload an unlimited number of images

2. No need to purchase a server, hosted on Cloudflare's network. When usage does not exceed Cloudflare's free quota, it's completely free

3. No need to purchase a domain name, you can use the free second-level domain `*.pages.dev` provided by Cloudflare Pages, and also supports binding custom domain names

4. Supports image review API, can be enabled as needed. When enabled, inappropriate images will be automatically blocked and no longer loaded

5. Supports backend image management, allowing you to preview uploaded images online, add to whitelist, blacklist, and other operations

6. Supports multiple file types (images, videos, audio, and more). Previewable files (images/video/audio/PDF) open directly in the browser instead of being force-downloaded

7. Optional Basic Auth protection for the upload endpoint and optional short links, both enabled on demand via environment variables

### Upload API

The upload endpoint is `POST /upload` using `multipart/form-data`, with the file in a field named `file`:

```bash
curl -F "file=@/path/to/image.png" https://your.domain/upload
```

The response is a JSON array where `src` is the file's access path (with short links enabled, this returns the short link directly):

```json
[{ "src": "/file/abc123def456.png" }]
```

If `UPLOAD_BASIC_USER` and `UPLOAD_BASIC_PASS` are configured, include Basic Auth with the request:

```bash
curl -u uploader:strong-password -F "file=@/path/to/image.png" https://your.domain/upload
```

The endpoint works with upload tools that support custom web image hosts, such as PicGo.

### Bind Custom Domain

In the custom domain section of Pages, bind a domain name that exists in Cloudflare. For domain names hosted in Cloudflare, DNS records will be automatically modified
![2](https://telegraph-image.pages.dev/file/29546e3a7465a01281ee2.png)

### Enable Image Review

1. Please go to https://moderatecontent.com/ to register and get a free API key for reviewing image content

2. Open the Cloudflare Pages management page, click `Settings`, `Environment Variables`, `Add Environment Variables` in sequence

3. Add a `variable name` as `ModerateContentApiKey`, `value` as the `API key` you just obtained in step 1, then click `Save`

Note: Since the changes will take effect on the next deployment, you may also need to go to the `Deployments` page and redeploy the project

After enabling image review, the first image load will be slow because review takes time. Subsequent image loads will not be affected due to caching
![3](https://telegraph-image.pages.dev/file/bae511fb116b034ef9c14.png)

### Limitations

1. Files are uploaded via the Telegram Bot API and stored on Telegram's servers. Uploads are limited by the Bot API (about 50MB per file), but the Bot API file download endpoint (getFile) only supports files up to 20MB, so files larger than 20MB cannot be served back after upload — treat 20MB as the practical per-file limit

2. Due to the use of Cloudflare's network, image loading speed may not be guaranteed in some regions

3. The free version of Cloudflare Function is limited to 100,000 requests per day (i.e., the total number of uploads or image loads cannot exceed 100,000). If exceeded, you may need to purchase the paid plan of Cloudflare Function. If image management is enabled, there will also be limitations on KV operation count, and you may need to purchase the paid plan if exceeded

### Local Development and Testing

```bash
npm install
npm start   # start a local dev server (wrangler pages dev on port 8080; dashboard credentials default to admin/123)
npm test    # run the unit tests (mocha)
```

### Thanks

Ideas and code provided by Hostloc @feixiang and @乌拉擦

## Update Log
July 19, 2026 - Upload Protection, Short Links, and Preview Update

- Added optional Basic Auth protection for the upload endpoint via `UPLOAD_BASIC_USER` and `UPLOAD_BASIC_PASS`, thanks to @ytagent and @lelouch0823 (#278/#279)
- Added optional short links: enable with `ENABLE_SHORT_URLS` and configure the length with `SHORT_URL_LENGTH`; uploads then return links like `/file/AbC123` and the dashboard copy buttons prefer the short link, thanks to @wyksean448 (#226/#305)
- Previewable files (images, video, audio, PDF) now open directly in the browser instead of being force-downloaded (#279)
- Fixed incorrect Content-Type on files stored via the Bot API, which prevented images from rendering on GitHub and other strict clients, thanks to @gynamics (#233/#305)
- Fixed the broken rename feature in the dashboard, and refactored core functions with unit test coverage, thanks to @ytagent (#277/#304)
- The dashboard "delete" action is now explicitly record-only and does not remove the source file from Telegram (#279)

August 15, 2025 - Dashboard Loading Performance Update

- The dashboard file list now loads in pages (KV cursor pagination + load more) instead of fetching all records at once (#253)
- Dashboard search now filters by filename prefix on the server (#254)

July 6, 2024 - Backend Management Page Update

- Support for two new management page views (Grid view and Waterfall view)

    1. Grid view, thanks to @DJChanahCJD for the submitted code
        Supports batch delete/copy links
        Supports sorting in reverse chronological order
        Supports pagination
        ![](https://camo.githubusercontent.com/a0551aa92f39517f0b30d86883882c1af4c9b3486e540c7750af4dbe707371fa/68747470733a2f2f696d6774632d3369312e70616765732e6465762f66696c652f6262616438336561616630356635333731363237322e706e67)
    2. Waterfall view, thanks to @panther125 for the submitted code
        ![](https://camo.githubusercontent.com/63d64491afc5654186248141bd343c363808bf8a77d3b879ffc1b8e57e5ac85d/68747470733a2f2f696d6167652e67696e636f64652e6963752f66696c652f3930346435373737613363306530613936623963642e706e67)

- Added automatic update support

    Now forked projects can automatically sync with the upstream repository to automatically install the latest project features, thanks to @bian2022

    Steps to enable automatic updates:
        After you fork the project, due to Github's limitations, you need to manually go to the Actions page of your forked project to enable Workflows, and enable Upstream Sync Action. Once enabled, automatic updates will occur hourly:
        ![](https://im.gurl.eu.org/file/f27ff07538de656844923.png)
        ![](https://im.gurl.eu.org/file/063b360119211c9b984c0.png)
    `If you encounter Upstream Sync execution errors, please manually Sync Fork once!`

    Manually update code

    If you want to manually update immediately, you can check [Github's documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork) to learn how to sync your forked project with upstream code.

    You can star/watch this project or follow the author to receive notifications of new feature updates.
- Added remote telemetry

    You can opt out of telemetry by adding the `disable_telemetry` environment variable

January 18, 2023 - Image Management Feature Update

1. Support for image management feature, disabled by default. To enable, after deployment, go to the backend and click `Settings`->`Functions`->`KV Namespace Bindings`->`Edit Bindings`->`Variable Name` enter: `img_url` `KV Namespace` select the KV storage space you created in advance. After enabling, visit http(s)://your-domain/admin to open the backend management page
| Variable Name | KV Namespace |
| ----------- | ----------- |
| img_url | Select the KV storage space created in advance |

![](https://im.gurl.eu.org/file/a0c212d5dfb61f3652d07.png)
![](https://im.gurl.eu.org/file/48b9316ed018b2cb67cf4.png)

2. The backend management page has a new login verification feature, also disabled by default. To enable, after deployment, go to the backend and click `Settings`->`Environment Variables`->`Define variables for production`->`Edit variables` and add the variables shown in the table below to enable login verification
| Variable Name | Value |
| ----------- | ----------- |
|BASIC_USER = | <Backend management page login username>|
|BASIC_PASS = | <Backend management page login password>|

![](https://im.gurl.eu.org/file/dff376498ac87cdb78071.png)

Of course, you can also choose not to set these two values, so that accessing the backend management page will not require verification and will skip the login step directly. This design allows you to use it in combination with Cloudflare Access to achieve email verification code login, Microsoft account login, Github account login, and other functions. It can be integrated with the existing login method on your domain without having to remember another set of backend credentials. For adding Cloudflare Access, please refer to the official documentation. Note that the protected path needs to include /admin and /api/manage/\*

You can also protect the public upload endpoint separately by setting both `UPLOAD_BASIC_USER` and `UPLOAD_BASIC_PASS`. When these two variables are not set, uploads remain public for compatibility with existing deployments.

3. Added image total count statistics
When the image management feature is enabled, you can view the number of images in the record at the top of the backend

![](https://im.gurl.eu.org/file/b7a37c08dc2c504199824.png)

4. Added image filename search
When the image management feature is enabled, you can use the image filename in the backend search box to quickly search and locate the images you need to manage

![](https://im.gurl.eu.org/file/faf6d59a7d4a48a555491.png)

5. Added image status display
When the image management feature is enabled, you can view the current status of the image in the backend { "ListType": "None", "TimeStamp": 1673984678274 }
ListType indicates whether the image is currently in the blacklist or whitelist. None means it's neither in the blacklist nor the whitelist, White means it's in the whitelist, Block means it's in the blacklist. TimeStamp is the timestamp when the image was first loaded. If image review API is enabled, the image review result will also be displayed here, identified by Label

![](https://im.gurl.eu.org/file/6aab78b83bbd8c249ee29.png)

6. Added blacklist feature
When the image management feature is enabled, you can manually add images to the blacklist in the backend. Images on the blacklist will not load properly

![](https://im.gurl.eu.org/file/fb18ef006a23677a52dfe.png)

7. Added whitelist feature
When the image management feature is enabled, you can manually add images to the whitelist in the backend. Images on the whitelist will always load properly, bypassing the image review API results

![](https://im.gurl.eu.org/file/2193409107d4f2bcd00ee.png)

8. Added record deletion feature
When the image management feature is enabled, you can manually delete image records in the backend. This only removes the item from the backend list; it does not delete the original file from Telegraph or Telegram. If the file is uploaded and loaded again later, a record may be created again. To prevent the file from loading, use the blacklist feature mentioned in point 6 above.

9. Added program running mode: Whitelist mode
When the image management feature is enabled, in addition to the default mode, this update also adds a new running mode. In this mode, only images added to the whitelist will be loaded. Uploaded images need to be approved before they can be displayed, which prevents inappropriate images from loading to the greatest extent. To enable, please set the environment variable: WhiteList_Mode=="true"

10. Added backend image preview feature
When the image management feature is enabled, you can preview images loaded through your domain in the backend. Click on images to zoom in, zoom out, rotate, and perform other operations

![](https://im.gurl.eu.org/file/740cd5a69672de36133a2.png)

## How to Update if Already Deployed?

Updating is actually very simple. Just refer to the update content above, first go to the Cloudflare Pages backend, set the required environment variables in advance and bind the KV namespace, then go to your previously forked repository on Github and select `Sync fork`->`Update branch`. After a while, Cloudflare Pages will detect that your repository has been updated and will automatically deploy the latest code

## Some Limitations:

Cloudflare KV only has a free write quota of 1000 times per day. Each new image loaded will consume this write quota. If this quota is exceeded, the image management backend will not be able to record newly loaded images

Maximum of 100,000 free read operations per day. Each image load will consume this quota (when there is no cache. If your domain has cache enabled on Cloudflare, this quota will only be consumed when the cache misses). If exceeded, blacklist and whitelist features may fail

Maximum of 1,000 free delete operations per day. Each image record will consume this quota. If exceeded, you will not be able to delete image records

Maximum of 1,000 free list operations per day. Each time you open or refresh the backend /admin, it will consume this quota. If exceeded, backend image management will be affected

In most cases, the free quota is basically sufficient and can be slightly exceeded. It doesn't stop immediately when exceeded. Each quota is calculated separately. When a certain operation exceeds the free quota, only that operation will be suspended and will not affect other functions. That is, even if my free write quota is used up, my read and write functions are not affected, images can load normally, I just can't see new images in the image management backend.

If your free quota is not enough, you can purchase the paid version of Cloudflare Workers from Cloudflare yourself, starting at $5 per month, pay-as-you-go, without the above quota limitations

In addition, changes made to environment variables will take effect on the next deployment. If you changed `Environment Variables` to enable or disable a certain function, remember to redeploy.

![](https://im.gurl.eu.org/file/b514467a4b3be0567a76f.png)

### Sponsorship

This project is tested with BrowserStack.

This project is support by [Cloudflare](https://www.cloudflare.com/).
