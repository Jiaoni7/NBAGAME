// 将 Web 资源复制到 www/ 目录，供 Capacitor 打包安卓 APK 使用
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');

const ASSETS = [
  'index.html',
  'game.js',
  'sw.js',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-1024.png',
  'manifest.webmanifest'
];

fs.mkdirSync(www, { recursive: true });

let count = 0;
for (const file of ASSETS) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(www, file));
    count++;
    console.log('  copied:', file);
  } else {
    console.warn('  skip (not found):', file);
  }
}
console.log(`\n✅ 已复制 ${count} 个文件到 www/，可执行 npm run sync 同步到安卓工程。`);
