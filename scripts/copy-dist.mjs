// 构建后把需要上线的文件收集到 dist/，供 wrangler deploy 使用
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// 根目录文件：页面 + 脚本 + 打包产物 + 全部样式
const rootFiles = [
  'index.html',
  'app.js',
  'wish-effects.js',
  'universe.bundle.js',
  ...fs.readdirSync(root).filter((f) => f.endsWith('.css')),
];
for (const f of rootFiles) fs.copyFileSync(path.join(root, f), path.join(dist, f));

// 静态资源整目录（图片、模型、字体），排除仅构建期使用的文件
const excluded = [
  'assets/textures',           // build-models.mjs 的贴图原料，运行时不用
  'assets/navigation-anime-prompts.md',
  'assets/navigation-image-prompts.md',
  'assets/nav-space.png',      // 未被引用的非 anime 版导航图
  'assets/nav-wishes.png',
];
fs.cpSync(path.join(root, 'assets'), path.join(dist, 'assets'), {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(root, src).replace(/\\/g, '/');
    return !excluded.some((e) => rel === e || rel.startsWith(`${e}/`));
  },
});

console.log(`dist ready: ${rootFiles.length} root files + assets/ -> ${dist}`);
