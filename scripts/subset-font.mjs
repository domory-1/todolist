// 下载 Zhi Mang Xing 字体并按项目实际用到的字符子集化，输出 woff2 到 assets/fonts/
// 用法: npm run build:font  （仅在字体或页面文案变化后需要重新执行）
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const family = 'Zhi Mang Xing';
const slug = 'Zhi Mang Xing';

// 1. 收集项目里出现过的所有可见字符（含 JS 里的文案），保证以后改文案也不缺字
const sources = ['index.html', 'app.js', 'universe.js', 'wish-effects.js']
  .map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
const extras = '＋×·✦♡，。！？、：；：“”‘’（）《》—…0123456789';
const charset = [...new Set([...sources.join(''), ...extras])]
  .filter((c) => c.codePointAt(0) >= 0x20)
  .map((c) => (/\s/.test(c) ? ' ' : c))
  .join('');
const text = [...new Set(charset)].join('');
console.log(`charset: ${text.length} unique chars`);

// 2. 下载字体（依次尝试镜像源与官方源）
async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}
async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
const cssUrls = [
  `https://fonts.loli.net/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(text)}`,
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(text)}`,
];
let fontBuf = null;
for (const cssUrl of cssUrls) {
  try {
    const css = await fetchText(cssUrl);
    // css2 text= 模式的 url 不带扩展名，靠后面的 format(...) 判断格式
    const faces = [...css.matchAll(/url\((['"]?)([^)'"]+)\1\)\s*format\((['"])(woff2|truetype)\3\)/g)]
      .map((m) => ({ url: m[2], format: m[4] }));
    if (!faces.length) throw new Error('no font url in css');
    // text= 模式下服务端已按字符裁剪，取第一个即可
    const face = faces.find((f) => f.format === 'woff2') || faces[0];
    const abs = face.url.startsWith('http') ? face.url : `https:${face.url}`;
    console.log(`downloading: ${abs}`);
    fontBuf = await fetchBuffer(abs);
    if (face.format !== 'woff2') {
      // 双保险：TTF 再本地裁一次
      fontBuf = await subsetFont(fontBuf, text, { targetFormat: 'woff2' });
    }
    break;
  } catch (err) {
    console.warn(`source failed: ${cssUrl} -> ${err.message}`);
  }
}
if (!fontBuf) { console.error('all font sources failed'); process.exit(1); }
console.log(`downloaded ${(fontBuf.length / 1024).toFixed(0)} KB`);

// 3. 写出（woff2 已含全部请求字符，直接落盘）
const woff2 = fontBuf;
const outDir = path.join(root, 'assets', 'fonts');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${slug.replace(/ /g, '')}-subset.woff2`);
fs.writeFileSync(outFile, woff2);
console.log(`written: ${outFile} (${(woff2.length / 1024).toFixed(1)} KB)`);
