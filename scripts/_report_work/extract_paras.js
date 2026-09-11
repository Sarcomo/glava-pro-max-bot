const fs = require('fs');
const path = 'c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/docx_extracted/word/document.xml';
let xml = fs.readFileSync(path, 'utf8');
const paras = [];
const pRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
let m;
while ((m = pRegex.exec(xml)) !== null) {
  const p = m[0];
  const texts = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(x => x[1]);
  const text = texts.join('')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  const style = (p.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || '';
  const jc = (p.match(/<w:jc w:val="([^"]+)"/) || [])[1] || '';
  const hasDrawing = p.includes('<w:drawing') || p.includes('<w:pict');
  const ind = (p.match(/<w:ind [^/]*\/>/) || [])[0] || '';
  const spacing = (p.match(/<w:spacing [^/]*\/>/) || [])[0] || '';
  if (text.trim() || hasDrawing) {
    paras.push({ style, jc, text, img: hasDrawing, ind, spacing });
  }
}
fs.writeFileSync(
  'c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/paras.json',
  JSON.stringify(paras, null, 2),
  'utf8'
);
console.log('paras:', paras.length);
paras.forEach((p, i) => {
  const line = `${String(i).padStart(3)} ${(p.style || '-').padEnd(22)} ${(p.jc || '-').padEnd(10)} ${p.img ? '[IMG]' : ''} ${p.text.slice(0, 140)}`;
  console.log(line);
});
