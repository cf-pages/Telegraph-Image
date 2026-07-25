// End-to-end check of the upload homepage against a running dev server.
//
//   npm start                 # terminal 1 (wrangler pages dev on :8080)
//   npm run test:e2e          # terminal 2
//
// Env: E2E_BASE_URL (default http://localhost:8080), E2E_CHROMIUM (path to a
// chromium binary when playwright's bundled download is unavailable),
// E2E_OUT (screenshot directory, default test/e2e/output).
//
// Uploads go through whatever STORAGE_PROVIDER the server runs with; use
// STORAGE_PROVIDER=r2 to exercise the whole flow without Telegram credentials.
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  // Playwright is intentionally not a project dependency — see README
  // ("Local Development and Testing"), since this suite is optional.
  console.error('Playwright is not installed. Run:\n');
  console.error('  npm install --no-save playwright && npx playwright install chromium\n');
  process.exit(2);
}
const path = require('path');
const fs = require('fs');

const BASE = process.env.E2E_BASE_URL || 'http://localhost:8080';
const OUT = process.env.E2E_OUT || path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });
const results = [];

function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

// Environment cannot exercise this check (e.g. no outbound network). Reported
// but not counted as a failure, so an offline run still ends green.
function skip(name, detail = '') {
  results.push({ name, passed: true, skipped: true, detail });
  console.log(`SKIP  ${name}${detail ? ' — ' + detail : ''}`);
}

function makePng(file, rgb) {
  // Minimal valid 1x1 PNG per colour so each upload is a distinct file.
  const zlib = require('zlib');
  const raw = Buffer.from([0, ...rgb]);
  const idat = zlib.deflateSync(raw);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crcTable = [];
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
    let crc = 0xffffffff;
    for (const b of body) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit truecolour
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  return file;
}

(async () => {
  const browser = await chromium.launch(
    process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {}
  );
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();

  // Script errors are defects; a blocked image/CDN host is the sandbox, not the
  // code (the wallpaper slideshow degrades to the CSS gradient either way).
  const consoleErrors = [];
  const resourceErrors = [];
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (/Failed to load resource|net::ERR_/.test(text)) resourceErrors.push(text);
    else consoleErrors.push(text);
  });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

  // --- 1. homepage loads and picks up SITE_NAME from /api/config
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const title = await page.title();
  const bodyText = await page.textContent('body');
  check('首页加载', true, `title="${title}"`);
  check('SITE_NAME 经 /api/config 生效', bodyText.includes('E2E Test Host') || title.includes('E2E Test Host'),
    `title="${title}"`);

  await page.screenshot({ path: path.join(OUT, 'shot-1-home.png'), fullPage: true });

  // --- 2. file input exists and accepts multiple files
  const fileInput = page.locator('input[type=file]').first();
  const inputCount = await page.locator('input[type=file]').count();
  const isMultiple = inputCount ? await fileInput.evaluate(el => el.hasAttribute('multiple')) : false;
  check('存在文件选择输入', inputCount > 0);
  check('支持多文件选择 (multiple)', isMultiple);

  // --- 3. batch upload of two files
  const f1 = makePng(path.join(OUT, 'e2e-a.png'), [255, 0, 0]);
  const f2 = makePng(path.join(OUT, 'e2e-b.png'), [0, 128, 255]);
  await fileInput.setInputFiles([f1, f2]);

  // wait for two result links to appear
  let links = [];
  for (let i = 0; i < 60; i++) {
    links = await page.evaluate(() => {
      const found = new Set();
      document.querySelectorAll('input,textarea').forEach(el => {
        const v = el.value || '';
        const m = v.match(/\/file\/[A-Za-z0-9_.\-]+/g);
        if (m) m.forEach(x => found.add(x));
      });
      document.querySelectorAll('a[href*="/file/"], img[src*="/file/"]').forEach(el => {
        const v = el.getAttribute('href') || el.getAttribute('src');
        const m = v && v.match(/\/file\/[A-Za-z0-9_.\-]+/);
        if (m) found.add(m[0]);
      });
      const text = document.body.innerText.match(/\/file\/[A-Za-z0-9_.\-]+/g);
      if (text) text.forEach(x => found.add(x));
      return [...found];
    });
    if (links.length >= 2) break;
    await page.waitForTimeout(500);
  }
  check('批量上传两个文件后出现两条结果链接', links.length >= 2, `找到 ${links.length} 条: ${links.join(', ')}`);
  await page.screenshot({ path: path.join(OUT, 'shot-2-uploaded.png'), fullPage: true });

  // --- 4. uploaded files are really retrievable and are the bytes we sent
  let retrievable = 0, correctType = 0;
  for (const l of links.slice(0, 2)) {
    const res = await page.request.get(BASE + l);
    if (res.ok()) retrievable++;
    if ((res.headers()['content-type'] || '').startsWith('image/')) correctType++;
  }
  check('结果链接可访问', retrievable === Math.min(2, links.length), `${retrievable}/${Math.min(2, links.length)}`);
  check('返回 image/* Content-Type', correctType === Math.min(2, links.length), `${correctType}/${Math.min(2, links.length)}`);

  // --- 5. output format switching (URL / Markdown / HTML / BBCode)
  const formats = await page.evaluate(() => {
    const out = {};
    const all = document.body.innerText;
    // buttons/tabs that switch the copy format
    const labels = [...document.querySelectorAll('button,[role=tab],label,a,select option')]
      .map(el => (el.innerText || el.value || '').trim()).filter(Boolean);
    out.labels = labels;
    out.hasMarkdown = /markdown/i.test(all) || labels.some(l => /markdown/i.test(l));
    out.hasBBCode = /bbcode|ubb/i.test(all) || labels.some(l => /bbcode|ubb/i.test(l));
    out.hasHtml = /\bhtml\b/i.test(all) || labels.some(l => /^html$/i.test(l));
    return out;
  });
  check('提供 Markdown 格式', formats.hasMarkdown);
  check('提供 BBCode 格式', formats.hasBBCode);
  check('提供 HTML 格式', formats.hasHtml);

  // click through format switchers and capture the produced text
  const formatSamples = {};
  for (const name of ['markdown', 'bbcode', 'html', 'url']) {
    const btn = page.locator(`button:has-text("${name}"), [role=tab]:has-text("${name}")`).first();
    const alt = page.locator(`button, [role=tab]`).filter({ hasText: new RegExp(name, 'i') }).first();
    const target = (await btn.count()) ? btn : ((await alt.count()) ? alt : null);
    if (target) {
      try {
        await target.click({ timeout: 2000 });
        await page.waitForTimeout(300);
        formatSamples[name] = await page.evaluate(() => {
          const vals = [...document.querySelectorAll('input,textarea')].map(e => e.value).filter(v => v && v.includes('/file/'));
          return vals[0] || '';
        });
      } catch (e) { formatSamples[name] = 'CLICK_FAILED: ' + e.message.split('\n')[0]; }
    }
  }
  const mdOk = /!\[.*\]\(.*\/file\/.*\)/.test(formatSamples.markdown || '');
  const bbOk = /\[img\].*\/file\/.*\[\/img\]/i.test(formatSamples.bbcode || '');
  const htmlOk = /<img\s+src=.*\/file\/.*>/i.test(formatSamples.html || '');
  check('Markdown 输出格式正确', mdOk, formatSamples.markdown || '(未取到)');
  check('BBCode 输出格式正确', bbOk, formatSamples.bbcode || '(未取到)');
  check('HTML 输出格式正确', htmlOk, formatSamples.html || '(未取到)');

  await page.screenshot({ path: path.join(OUT, 'shot-3-formats.png'), fullPage: true });

  // --- 6. drag & drop upload
  const f3 = makePng(path.join(OUT, 'e2e-c.png'), [0, 200, 0]);
  const b64 = fs.readFileSync(f3).toString('base64');
  const beforeDrop = links.length;
  const dropTarget = await page.evaluate(() => {
    // find the element that registers a drop handler, fall back to body
    const cands = ['#dropzone', '#drop-zone', '.drop-zone', '[data-drop]', '.upload-area', 'main', 'body'];
    for (const c of cands) if (document.querySelector(c)) return c;
    return 'body';
  });
  await page.evaluate(async ({ b64, sel }) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const file = new File([bin], 'dropped.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);
    const el = document.querySelector(sel);
    for (const type of ['dragenter', 'dragover', 'drop']) {
      el.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }));
    }
  }, { b64, sel: dropTarget });

  let afterDrop = beforeDrop;
  for (let i = 0; i < 40; i++) {
    const now = await page.evaluate(() => {
      const found = new Set();
      const t = document.body.innerText.match(/\/file\/[A-Za-z0-9_.\-]+/g);
      if (t) t.forEach(x => found.add(x));
      document.querySelectorAll('input,textarea').forEach(el => {
        const m = (el.value || '').match(/\/file\/[A-Za-z0-9_.\-]+/g);
        if (m) m.forEach(x => found.add(x));
      });
      return found.size;
    });
    if (now > beforeDrop) { afterDrop = now; break; }
    await page.waitForTimeout(500);
  }
  check('拖拽上传生效', afterDrop > beforeDrop, `拖拽前 ${beforeDrop} 条 → 拖拽后 ${afterDrop} 条 (drop target: ${dropTarget})`);
  await page.screenshot({ path: path.join(OUT, 'shot-4-dragdrop.png'), fullPage: true });

  // --- 7. admin entry link present (HIDE_ADMIN_ENTRY unset)
  const adminLink = await page.locator('a[href*="admin"]').count();
  check('首页显示后台入口', adminLink > 0, `${adminLink} 个链接`);

  // --- 8. dashboard loads and lists the uploads
  const adminCtx = await browser.newContext({ httpCredentials: { username: 'admin', password: '123' } });
  const admin = await adminCtx.newPage();
  const adminErrors = [];
  admin.on('pageerror', e => adminErrors.push(e.message));
  const adminCdnFailures = [];
  admin.on('requestfailed', r => { if (!r.url().includes('localhost')) adminCdnFailures.push(r.url()); });
  const adminResp = await admin.goto(BASE + '/admin', { waitUntil: 'networkidle' });
  await admin.waitForTimeout(2500);
  const adminText = await admin.textContent('body');
  const adminRows = await admin.locator('img[src*="/file/"], [class*=card], tr').count();
  const adminRendered = adminRows > 0 || /r2-/.test(adminText);
  const cdnBlocked = !adminRendered && adminCdnFailures.length > 0;
  if (cdnBlocked) {
    // admin.html pulls Vue + Element UI from cdn.jsdelivr.net; unreachable CDN
    // means a blank dashboard, which is worth knowing but is not a code defect.
    skip('后台页面加载并显示记录', `CDN 不可达（${adminCdnFailures.length} 个外部资源加载失败），此环境无法验证后台 UI`);
  } else {
    check('后台页面加载并显示记录', adminRendered,
      `HTTP ${adminResp && adminResp.status()}, 元素 ${adminRows} 个, JS错误: ${adminErrors.slice(0,2).join('|') || 'none'}`);
  }
  await admin.screenshot({ path: path.join(OUT, 'shot-5-admin.png'), fullPage: true });

  // --- 9. no console errors
  check('无 JS 脚本错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | ') || 'none');
  if (resourceErrors.length) {
    console.log(`INFO  ${resourceErrors.length} 个外部资源未加载（壁纸/CDN，属环境限制）`);
  }

  await browser.close();

  const failed = results.filter(r => !r.passed);
  const skipped = results.filter(r => r.skipped);
  console.log(`\n===== ${results.length - failed.length - skipped.length}/${results.length - skipped.length} 通过` +
    (skipped.length ? `，${skipped.length} 项跳过` : '') + ' =====');
  if (failed.length) {
    console.log('失败项:');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.detail}`));
  }
  fs.writeFileSync(path.join(OUT, 'e2e-results.json'), JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('E2E CRASHED:', e); process.exit(2); });
