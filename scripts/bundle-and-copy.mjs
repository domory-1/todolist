// 统一构建入口：优先用 esbuild 现场打包，环境里没有（如 CI 跳过装依赖）就复用已提交的 universe.bundle.js，
// 最后把上线文件收集到 dist/。本地与 CI 都跑 `npm run build` 即可。
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outfile = path.join(root, 'universe.bundle.js');

let bundled = false;
try {
  const esbuild = await import('esbuild');
  await esbuild.build({
    entryPoints: [path.join(root, 'universe.js')],
    bundle: true,
    minify: true,
    format: 'esm',
    outfile,
    logLevel: 'info',
  });
  bundled = true;
  console.log('esbuild: universe.js bundled fresh');
} catch (err) {
  console.warn(`esbuild unavailable (${String(err.message).split('\n')[0]})`);
}

if (!bundled) {
  if (!existsSync(outfile)) {
    console.error('universe.bundle.js missing — run `npm install` locally, then `npm run build`');
    process.exit(1);
  }
  console.log('reusing committed universe.bundle.js');
}

await import(pathToFileURL(path.join(root, 'scripts', 'copy-dist.mjs')));
