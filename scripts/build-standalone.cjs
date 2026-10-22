// Package the verified Vite build as one offline HTML. No runtime CDN or assets.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
html = html.replace(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const js = fs.readFileSync(
    path.resolve(dist, src.replace(/^\.\//, '').replace(/^\//, '')),
    'utf8',
  );
  return '<script type="module">' + js.replace(/<\/script/gi, '<\\/script') + '</script>';
});
html = html.replace(
  /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
  (_, href) =>
    '<style>' +
    fs.readFileSync(path.resolve(dist, href.replace(/^\.\//, '').replace(/^\//, '')), 'utf8') +
    '</style>',
);
if (/<(?:script[^>]*src|link[^>]*href)=/i.test(html) || /@import\s/.test(html))
  throw new Error('Offline build still has external entry points.');
const out = path.join(root, 'demo', 'starbreak-play.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Offline HTML ready: demo/starbreak-play.html (' + Buffer.byteLength(html) + ' bytes)');
