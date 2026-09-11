const fs = require('fs');
const xml = fs.readFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/docx_extracted/word/document.xml', 'utf8');

// Find paragraph containing "В последние годы"
const idx = xml.indexOf('В последние годы');
const start = xml.lastIndexOf('<w:p ', idx);
const end = xml.indexOf('</w:p>', idx) + 6;
fs.writeFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/body_para_sample.xml', xml.slice(start, end), 'utf8');

// Find list paragraph
const idx2 = xml.indexOf('Провести анализ существующих');
const start2 = xml.lastIndexOf('<w:p ', idx2);
const end2 = xml.indexOf('</w:p>', idx2) + 6;
fs.writeFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/list_para_sample.xml', xml.slice(start2, end2), 'utf8');

// heading sample
const idx3 = xml.indexOf('>ВВЕДЕНИЕ<');
const start3 = xml.lastIndexOf('<w:p ', idx3);
const end3 = xml.indexOf('</w:p>', idx3) + 6;
fs.writeFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/h1_sample.xml', xml.slice(start3, end3), 'utf8');

// title page student line
const idx4 = xml.indexOf('Биктулова');
const start4 = xml.lastIndexOf('<w:p ', idx4);
const end4 = xml.indexOf('</w:p>', idx4) + 6;
fs.writeFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/student_sample.xml', xml.slice(start4, end4), 'utf8');

// logo paragraph
const idx5 = xml.indexOf('<w:drawing');
const start5 = xml.lastIndexOf('<w:p ', idx5);
const end5 = xml.indexOf('</w:p>', idx5) + 6;
fs.writeFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/logo_para.xml', xml.slice(start5, Math.min(end5, start5 + 5000)), 'utf8');

// document.xml.rels
const rels = fs.readFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/docx_extracted/word/_rels/document.xml.rels', 'utf8');
fs.writeFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/document.xml.rels', rels, 'utf8');
console.log('ok', end - start, end2 - start2);
