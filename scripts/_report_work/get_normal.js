const fs = require('fs');
const styles = fs.readFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/docx_extracted/word/styles.xml', 'utf8');
const m = styles.match(/<w:style[^>]*w:styleId="a"[\s\S]*?<\/w:style>/);
fs.writeFileSync('c:/Users/Zhamb/glava-pro-max-bot/scripts/_report_work/style_a.xml', m ? m[0] : 'missing', 'utf8');
console.log(m ? m[0].slice(0, 1500) : 'missing');

// docDefaults
const d = styles.match(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/);
console.log('\nDEFAULTS:\n', d ? d[0] : 'none');
