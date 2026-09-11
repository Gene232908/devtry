import fs from 'node:fs';
import { resolve } from 'node:path';
import HtmlToDocx from 'html-to-docx';

const root = resolve(import.meta.dirname, '..');
const htmlPath = resolve(root, 'tmp/pdfs/super-admin-manual.html');
const outPath = resolve(root, 'output/super-admin-manual.docx');
const flowchart = `data:image/svg+xml;base64,${fs.readFileSync(resolve(root, 'assets/documents/super-admin-workflow.svg')).toString('base64')}`;
const html = fs.readFileSync(htmlPath, 'utf8')
  .replaceAll('file:///' + resolve(root, 'assets/documents/super-admin-workflow.svg').replaceAll('\\', '/'), flowchart);
const docx = await HtmlToDocx(html, null, { title: 'Super Admin Manual', creator: '', subject: 'Super Admin workflow manual', margins: { top: 1440, bottom: 1440, left: 1440, right: 1440 } });
fs.writeFileSync(outPath, docx);
console.log(outPath);
