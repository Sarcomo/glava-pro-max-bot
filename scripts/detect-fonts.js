const https = require('https');
const { URL } = require('url');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(new URL(res.headers.location, url).href).then(resolve, reject);
      }
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ url, body: d, headers: res.headers }));
    }).on('error', reject);
  });
}

(async () => {
  const { body } = await get('https://glava.pro/');
  const cssHrefs = [...body.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)]
    .map((m) => m[1])
    .filter((h) => /css|font/i.test(h) || /stylesheet/i.test(body.slice(Math.max(0, body.indexOf(h) - 80), body.indexOf(h))));

  const allLinks = [...body.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const styleLinks = allLinks.filter((u) => /\.css|fonts\.|font/i.test(u));
  console.log('STYLE_OR_FONT_LINKS');
  [...new Set(styleLinks)].forEach((l) => console.log(l));

  const inline = [...body.matchAll(/font-family\s*:\s*([^;}{]+)/gi)].map((m) => m[1].trim());
  console.log('\nINLINE_FONT_FAMILY');
  [...new Set(inline)].forEach((f) => console.log(f));

  // fetch first few css files
  for (const href of [...new Set(styleLinks)].slice(0, 12)) {
    let abs;
    try { abs = new URL(href, 'https://glava.pro/').href; } catch { continue; }
    if (!/\.css/i.test(abs) && !/fonts\.google/i.test(abs)) continue;
    console.log('\nFETCH', abs);
    try {
      const css = await get(abs);
      const fams = [...css.body.matchAll(/font-family\s*:\s*([^;}{]+)/gi)].map((m) => m[1].trim());
      const faces = [...css.body.matchAll(/@font-face\s*\{([\s\S]*?)\}/gi)].map((m) => {
        const family = (m[1].match(/font-family\s*:\s*([^;]+)/i) || [])[1];
        const src = (m[1].match(/src\s*:\s*([^;]+)/i) || [])[1];
        return `${(family || '').trim()} | ${(src || '').trim().slice(0, 120)}`;
      });
      console.log('families:', [...new Set(fams)].slice(0, 20).join(' || '));
      if (faces.length) console.log('faces:', faces.slice(0, 15).join('\n  '));
      if (/fonts\.googleapis\.com\/css/.test(abs)) {
        console.log('GOOGLE_CSS_SNIP', css.body.slice(0, 500));
      }
    } catch (e) {
      console.log('fail', e.message);
    }
  }
})();
