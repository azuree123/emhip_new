// Prints the HTML files written by build_docs.py to PDF (docs/handover/pdf) with headless Google
// Chrome over the DevTools protocol, adding "EMHIP · <title>" and "Page X of Y" to every footer.
// Needs Node 22+ (built-in WebSocket) and Google Chrome.
//
// Usage: node docs/handover/_build/print_pdfs.mjs [--shots]   (--shots also saves page PNGs of the
// HTML to _build/shots for a visual check)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const htmlDir = path.join(here, 'html');
const pdfDir = path.join(here, '..', 'pdf');
const shotDir = path.join(here, 'shots');
const takeShots = process.argv.includes('--shots');
const chromePath =
  process.env.CHROME_PATH ??
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : 'google-chrome');
const port = 9444;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const manifest = fs
  .readFileSync(path.join(htmlDir, 'manifest.txt'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => line.split('\t'));

fs.mkdirSync(pdfDir, { recursive: true });
if (takeShots) fs.mkdirSync(shotDir, { recursive: true });

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'emhip-pdf-'));
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });

let target;
for (let i = 0; i < 60 && !target; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
  } catch {}
  if (!target) await sleep(250);
}
if (!target) throw new Error('Chrome did not start');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let nextId = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });

await send('Page.enable');
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

for (const [name, title] of manifest) {
  const file = path.join(htmlDir, `${name}.html`);
  await send('Page.navigate', { url: `file://${file}` });
  await sleep(900);
  const footer = `<div style="font-family: Arial, sans-serif; font-size: 8px; color: #7a7a7a; width: 100%; padding: 0 17mm; display: flex; justify-content: space-between;"><span>EMHIP · ${escapeHtml(title)}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
  const { data } = await send('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: footer,
  });
  fs.writeFileSync(path.join(pdfDir, `${name}.pdf`), Buffer.from(data, 'base64'));
  console.log(`printed ${name}.pdf`);

  if (takeShots) {
    await send('Emulation.setDeviceMetricsOverride', { width: 820, height: 1160, deviceScaleFactor: 1, mobile: false });
    for (const [n, y] of [[1, 0], [2, 1160], [3, 2320], [4, 4640]]) {
      await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y})` });
      await sleep(150);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(shotDir, `${name}-${n}.png`), Buffer.from(shot.data, 'base64'));
    }
    await send('Emulation.clearDeviceMetricsOverride');
  }
}

ws.close();
chrome.kill();
await sleep(300);
fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
