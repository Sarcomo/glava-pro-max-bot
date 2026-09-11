const fs = require('fs');
const paras = JSON.parse(fs.readFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/paras.json', 'utf8'));
const out = paras.map((p, i) => {
  const tag = [p.style || '-', p.jc || '-', p.img ? 'IMG' : ''].filter(Boolean).join('|');
  return `[${i}] {${tag}} ${p.text}`;
}).join('\n');
fs.writeFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/paras_utf8.txt', out, 'utf8');
console.log('written', out.length);

const xml = fs.readFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/docx_extracted/word/document.xml', 'utf8');
const sect = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g);
fs.writeFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/sectPr.xml', (sect || []).join('\n\n'), 'utf8');
console.log('sectPr count', (sect || []).length);

// sample first body paragraph with full pPr
const bodyStart = xml.indexOf('<w:body>');
const firstPs = [...xml.slice(bodyStart).matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].slice(0, 25);
const samples = firstPs.map((m, i) => {
  const p = m[0];
  const pPr = (p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || ['(no pPr)'])[0];
  const t = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(x => x[1]).join('');
  return `=== ${i}: ${t.slice(0, 80)}\n${pPr}`;
}).join('\n\n');
fs.writeFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/pPr_samples.xml', samples, 'utf8');

// styles of interest
const styles = fs.readFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/docx_extracted/word/styles.xml', 'utf8');
const styleIds = ['1', '2', '11', '21', 'a9', 'aa', 'a3', 'Normal'];
const styleSnips = styleIds.map(id => {
  const re = new RegExp(`<w:style[^>]*w:styleId="${id}"[\\s\\S]*?<\\/w:style>`);
  const m = styles.match(re);
  return m ? m[0].slice(0, 800) : `missing ${id}`;
}).join('\n\n----\n\n');
fs.writeFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/style_snips.xml', styleSnips, 'utf8');
