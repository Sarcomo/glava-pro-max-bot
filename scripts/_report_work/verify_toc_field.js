const fs = require('fs');
const { execSync } = require('child_process');
const work = 'c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/_toc_check2';
const out = 'c:/Users/Zhamb/glava-pro-max-bot/Отчёт_Жамсаранжапов_30стр.docx';
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
fs.copyFileSync(out, work + '/o.zip');
execSync(
  `powershell -NoProfile -Command "Expand-Archive -Force '${work}/o.zip' '${work}/x'"`,
  { stdio: 'inherit' },
);
const xml = fs.readFileSync(work + '/x/word/document.xml', 'utf8');
const settings = fs.readFileSync(work + '/x/word/settings.xml', 'utf8');
const instrs = [...xml.matchAll(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/g)].map((m) => m[1]);
console.log('TOC instr', instrs.filter((i) => /TOC/i.test(i)));
console.log('updateFields', /w:updateFields/.test(settings));
console.log('hyperlinks', (xml.match(/w:hyperlink/g) || []).length);
console.log('bookmarks bm_', (xml.match(/w:name="bm_/g) || []).length);
