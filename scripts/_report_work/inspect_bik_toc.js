const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const downloads = 'c:/Users/Zhamb/Downloads';
const folder = fs.readdirSync(downloads).find((n) => n.includes('20260910'));
const inner = fs.readdirSync(path.join(downloads, folder))[0];
const dir = path.join(downloads, folder, inner);
const docx = fs
  .readdirSync(dir)
  .find((n) => n.includes('Биктулова') && n.startsWith('Отчёт') && !n.includes('Жам'));
console.log('DOC', docx);

const work = path.join(__dirname, '_bik_toc');
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
fs.copyFileSync(path.join(dir, docx), path.join(work, 'b.zip'));
execSync(
  `powershell -NoProfile -Command "Expand-Archive -Force '${work.replace(/'/g, "''")}/b.zip' '${work.replace(/'/g, "''")}/x'"`,
  { stdio: 'inherit' },
);

const xml = fs.readFileSync(path.join(work, 'x/word/document.xml'), 'utf8');
console.log('hyperlink', (xml.match(/w:hyperlink/g) || []).length);
console.log('bookmarkStart', (xml.match(/w:bookmarkStart/g) || []).length);
console.log('fldChar', (xml.match(/fldChar/g) || []).length);

const instrs = [...xml.matchAll(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/g)].map((m) => m[1]);
const interesting = instrs.filter((x) => /TOC|PAGEREF|HYPERLINK/i.test(x));
console.log('interesting instr count', interesting.length);
console.log(interesting.slice(0, 20));

// Look at first TOC hyperlink block structure
const i = xml.indexOf('PAGEREF');
console.log('pageref snippet:\n', xml.slice(i - 300, i + 400));

const j = xml.indexOf('w:hyperlink');
console.log('first hyperlink snippet:\n', xml.slice(j, j + 500));
