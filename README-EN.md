# Telegraph-Image
Free Image Hosting solution, Flickr/imgur alternative. Using Cloudflare Pages and Telegraph.

English|[中文](readme-zh.md)

## Deployment

### Preparation
The only thing you need to prepare in advance is a Cloudflare account

### Step by Step Instruction
3 simple steps to deploy this project and have your own image hosting

1.Download or fork this repository (Note: Please use fork at this time, there is some issue when using download #14)

2.Open the Cloudflare Dashboard, enter the Pages management page, choose to create a project, if the choice in the first step is fork this repository, then choose`Connecting to the Git Provider`，if you chose to download this repository in the first step, select`Direct Upload`
![1](https://telegraph-image.pages.dev/file/8d4ef9b7761a25821d9c2.png)

3. Follow the prompts on the page to enter the project name, select the git repository you need to connect to (the first step is to choose fork) or upload the repository file you just downloaded (the first step is to choose download this repository), click`Deploy`

## Features
1. Unlimited number of images stored, you can upload an unlimited number of images

2. No need to buy a server, hosted on Cloudflare's network, when the use does not exceed Cloudflare's free quota, completely free

3. No need to buy a domain name, you can use the free second-level domain name `*.pages.dev` provided by Cloudflare Pages, and also support binding custom domain names

4. Support image review API, can be opened as needed, after opening undesirable images will be automatically blocked, no longer loaded

### Add custom domains
Inside the custom domain of pages, bind the domain name that exists in your Cloudflare account, the domain name hosted in cloudflare, will automatically modify the dns record
![2](https://telegraph-image.pages.dev/file/29546e3a7465a01281ee2.png)

### Setup image review API
1. Please go to https://moderatecontent.com/ to register and get a free API key for reviewing image content

2. Open the settings of Cloudflare Pages, click `Settings`, `Environment Variables`, `Add Environment Variables` in turn

3. Add a `variable` name as `ModerateContentApiKey`, `value` as the `API key` you just got in the first step, click `Save` to

Note: Since the changes will take effect on the next deployment, you may need to go to the `Deploy` page and redeploy the project

When image review is enabled, the first time image load will be slow because it takes time to review, but the subsequent image load will not be affected due to the existence of cache
![3](https://telegraph-image.pages.dev/file/bae511fb116b034ef9c14.png)

### Limitations
1. Since the image files are actually stored in Telegraph, Telegraph limits the size of uploaded images to a maximum of 5MB

2. Due to the use of Cloudflare's network, the loading speed of images may not be guaranteed in some areas.

3. The free version of Cloudflare Function is limited to 100,000 requests per day (i.e. the total number of uploads or loads of images cannot exceed 100,000), if this is exceeded, you may need to choose to purchase the paid package of Cloudflare Function.

### Thanks
Ideas and code provided by Hostloc @feixiang and @乌拉擦




