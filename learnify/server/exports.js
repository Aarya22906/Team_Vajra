// Real file exports from generated course content: PPTX, PDFs, ZIP bundles.
import PptxGenJS from 'pptxgenjs';
import PDFDocument from 'pdfkit';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'node:stream';

const rt = c => (String(c.version ?? '').toLowerCase().startsWith(String(c.language).toLowerCase()) ? c.version : `${c.language} ${c.version ?? ''}`.trim());
const ext = l => ({ java: 'java', python: 'py', node: 'mjs', ts: 'ts' })[l] ?? 'txt';
const fileOf = l => ({ java: 'Main.java', python: 'main.py', node: 'main.mjs', ts: 'main.ts' })[l] ?? 'snippet.txt';
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'course';
const hex = (c, d) => (/^#[0-9a-f]{6}$/i.test(c ?? '') ? c.slice(1) : d);

export async function pptx(course, content, brand = {}) {
  const P = hex(brand.primary, '2346FF'), S = hex(brand.secondary, '3D5CFF');
  const p = new PptxGenJS(); p.layout = 'LAYOUT_16x9'; p.title = course.title; p.company = brand.logoText ?? 'LearnifyAI';
  content.slides.forEach((s, i) => {
    const sl = p.addSlide();
    if (s.layout === 'title') {
      sl.background = { color: P };
      sl.addText(brand.logoText ?? 'LearnifyAI', { x: 0.7, y: 0.6, w: 6, h: 0.4, fontSize: 12, color: 'FFFFFF', bold: true, charSpacing: 4 });
      sl.addText(s.title, { x: 0.7, y: 2.0, w: 8.6, h: 1.6, fontSize: 40, bold: true, color: 'FFFFFF', fontFace: 'Arial', fit: 'shrink' });
      sl.addText(s.bullets[0] ?? content.subtitle ?? '', { x: 0.7, y: 3.7, w: 8.6, h: 0.6, fontSize: 18, color: 'DCE3FF' });
    } else {
      sl.background = { color: 'FFFFFF' };
      sl.addShape('rect', { x: 0, y: 0, w: 0.16, h: 5.625, fill: { color: P } });
      sl.addText(s.title, { x: 0.6, y: 0.35, w: 8.8, h: 0.8, fontSize: 28, bold: true, color: '0F172A', fontFace: 'Arial', fit: 'shrink' });
      if (s.layout === 'code' && s.code) {
        sl.addText(s.bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true } })), { x: 0.6, y: 1.4, w: 3.2, h: 3.4, fontSize: 15, color: '334155', valign: 'top' });
        sl.addShape('roundRect', { x: 4.0, y: 1.4, w: 5.5, h: 3.5, fill: { color: '0B1120' }, rectRadius: 0.1 });
        sl.addText(s.code, { x: 4.15, y: 1.5, w: 5.2, h: 3.3, fontSize: 11, fontFace: 'Courier New', color: 'E2E8F0', valign: 'top', fit: 'shrink' });
      } else if (s.layout === 'diagram' && s.diagram) {
        sl.addText(s.bullets.map(b => ({ text: b, options: { bullet: true, breakLine: true } })), { x: 0.6, y: 1.4, w: 2.9, h: 3.4, fontSize: 15, color: '334155', valign: 'top' });
        const X = 3.8, W = 5.7, Y = 1.4, H = 3.4, byId = Object.fromEntries(s.diagram.nodes.map(n => [n.id, n]));
        s.diagram.edges.forEach(([a, b]) => { const u = byId[a], v = byId[b]; if (u && v) sl.addShape('line', { x: X + (Math.min(u.x, v.x) / 100) * W, y: Y + (Math.min(u.y, v.y) / 100) * H, w: (Math.abs(u.x - v.x) / 100) * W || 0.001, h: (Math.abs(u.y - v.y) / 100) * H || 0.001, flipV: (u.x < v.x) !== (u.y < v.y), line: { color: '64748B', width: 1.5, endArrowType: 'triangle' } }); });
        s.diagram.nodes.forEach((n, k) => sl.addText(n.label, { x: X + (n.x / 100) * W - 0.8, y: Y + (n.y / 100) * H - 0.25, w: 1.6, h: 0.5, fontSize: 11, bold: true, align: 'center', valign: 'middle', color: k === 0 ? 'FFFFFF' : P, fill: { color: k === 0 ? P : 'EEF2FF' }, line: { color: P, width: 1 }, shape: 'roundRect' }));
      } else if (s.layout === 'two-col') {
        const half = Math.ceil(s.bullets.length / 2);
        [s.bullets.slice(0, half), s.bullets.slice(half)].forEach((col, k) => {
          sl.addShape('roundRect', { x: 0.6 + k * 4.5, y: 1.4, w: 4.3, h: 3.4, fill: { color: k ? 'EEF2FF' : 'F1F5F9' }, rectRadius: 0.1 });
          sl.addText(col[0] ?? '', { x: 0.85 + k * 4.5, y: 1.55, w: 3.8, h: 0.5, fontSize: 16, bold: true, color: k ? P : '0F172A' });
          sl.addText(col.slice(1).map(b => ({ text: b, options: { bullet: true, breakLine: true } })), { x: 0.85 + k * 4.5, y: 2.1, w: 3.8, h: 2.5, fontSize: 14, color: '334155', valign: 'top' });
        });
      } else {
        sl.addText(s.bullets.map(b => ({ text: b, options: { bullet: s.layout !== 'summary' ? true : { code: '2713' }, breakLine: true, paraSpaceAfter: 8 } })), { x: 0.6, y: 1.4, w: 8.8, h: 3.5, fontSize: 20, color: '1E293B', valign: 'top', fit: 'shrink' });
      }
      sl.addText(`${brand.logoText ?? 'LearnifyAI'}${brand.footer ? ' · ' + brand.footer : ''}`, { x: 0.6, y: 5.15, w: 7, h: 0.3, fontSize: 9, color: '64748B' });
      sl.addText(`${i + 1} / ${content.slides.length}`, { x: 8.4, y: 5.15, w: 1.1, h: 0.3, fontSize: 9, color: '64748B', align: 'right' });
    }
    if (s.notes) sl.addNotes(s.notes);
  });
  return p.write({ outputType: 'nodebuffer' });
}

function pdf(build, { landscape = false } = {}) {
  const doc = new PDFDocument({ size: 'A4', layout: landscape ? 'landscape' : 'portrait', margin: 48, bufferPages: true });
  const chunks = []; doc.on('data', c => chunks.push(c));
  const done = new Promise(r => doc.on('end', () => r(Buffer.concat(chunks))));
  build(doc); doc.end();
  return done;
}
const h1 = (d, t) => d.font('Helvetica-Bold').fontSize(22).fillColor('#0F172A').text(t).moveDown(0.4);
const h2 = (d, t) => d.moveDown(0.5).font('Helvetica-Bold').fontSize(13).fillColor('#2346FF').text(t).moveDown(0.2);
const p = (d, t) => d.font('Helvetica').fontSize(10.5).fillColor('#1E293B').text(t, { lineGap: 2 });
const code = (d, t) => { const w = d.page.width - d.page.margins.left - d.page.margins.right; const h = d.font('Courier').fontSize(9).heightOfString(t, { width: w - 16 }) + 14; if (d.y + h > d.page.height - 60) d.addPage(); const y = d.y; d.roundedRect(d.page.margins.left, y, w, h, 5).fill('#0B1120'); d.fillColor('#E2E8F0').text(t, d.page.margins.left + 8, y + 7, { width: w - 16 }); d.y = y + h + 6; d.x = d.page.margins.left; };
const footer = (d, label) => { const r = d.bufferedPageRange(); for (let i = 0; i < r.count; i++) { d.switchToPage(i); d.font('Helvetica').fontSize(8).fillColor('#64748B').text(`${label} · page ${i + 1} of ${r.count}`, 48, d.page.height - 32, { width: d.page.width - 96, align: 'center', lineBreak: false }); } };

export const slidesPdf = (course, c) => pdf(d => {
  c.slides.forEach((s, i) => {
    if (i) d.addPage();
    h1(d, s.title);
    s.bullets.forEach(b => p(d, '• ' + b).moveDown(0.3));
    if (s.code) { d.moveDown(0.5); code(d, s.code); }
    if (s.diagram) { d.moveDown(0.5); p(d, 'Diagram: ' + s.diagram.nodes.map(n => n.label).join(' → ')); }
  });
  footer(d, course.title);
}, { landscape: true });

export const notesPdf = (course, c) => pdf(d => {
  h1(d, `Trainer notes · ${course.title}`);
  p(d, `${course.level} · ${course.durationMin} minutes · ${rt(c)}`);
  c.slides.forEach((s, i) => { h2(d, `${i + 1}. ${s.title}`); p(d, s.notes || '(no notes)'); });
  h2(d, 'Exercise answers');
  c.exercises.forEach(x => { p(d, x.title).moveDown(0.2); code(d, x.solution); });
  footer(d, course.title);
});

export const quizPdf = (course, c) => pdf(d => {
  h1(d, `Quiz · ${course.title}`);
  c.quiz.forEach((q, i) => { h2(d, `${i + 1}. ${q.q}`); q.options.forEach((o, k) => p(d, `${String.fromCharCode(65 + k)}. ${o}`)); });
  d.addPage(); h1(d, 'Answers and explanations');
  c.quiz.forEach((q, i) => { p(d, `${i + 1}. ${String.fromCharCode(65 + q.answer)}. ${q.explanation}`).moveDown(0.4); });
  footer(d, course.title);
});

export const cheatPdf = (course, c) => pdf(d => {
  h1(d, `Cheat sheet · ${course.title}`);
  c.cheat.forEach(sec => { h2(d, sec.title); (sec.items ?? []).forEach(([a, b]) => { d.font('Courier').fontSize(9.5).fillColor('#0F172A').text(a); d.font('Helvetica').fontSize(9).fillColor('#64748B').text(b).moveDown(0.3); }); });
  footer(d, course.title);
});

export const reportPdf = (course, c) => pdf(d => {
  h1(d, `Verification report · ${course.title}`);
  p(d, `Runtime: ${rt(c)} · generated ${c.generatedAt} · model provider: ${c.provider}`);
  p(d, `Snippets: ${c.summary.total} · passed ${c.summary.passed} · failed ${c.summary.failed} · auto-fixed ${c.summary.autoFixed} · unverified ${c.summary.skipped}`);
  c.snippets.forEach(s => {
    h2(d, `${s.name} — ${s.status.toUpperCase()}${s.attempts.length > 1 ? ` (attempt ${s.attempts.length})` : ''}`);
    s.attempts.forEach(a => p(d, `Attempt ${a.n}${a.part ? ' (' + a.part + ')' : ''}: ${a.ok ? 'passed' : 'failed'} · ${a.ms} ms${a.problem ? ' · ' + a.problem.split('\n')[0] : ''}`));
  });
  footer(d, 'Verification report');
});

function zip(add) {
  const z = new ZipArchive({ zlib: { level: 9 } }); const out = new PassThrough(); const chunks = [];
  out.on('data', c => chunks.push(c)); z.pipe(out);
  const done = new Promise((res, rej) => { out.on('end', () => res(Buffer.concat(chunks))); z.on('error', rej); });
  add(z); z.finalize(); return done;
}
export const codeZip = (course, c) => zip(z => {
  const f = fileOf(c.runnerLang ?? 'java');
  c.examples.forEach((e, i) => z.append(e.code, { name: `examples/example-${i + 1}-${slug(e.title)}/${f}` }));
  z.append(`# ${course.title}\n\nRun each example from its own folder.\n\n${c.runnerLang === 'java' ? 'java Main.java' : c.runnerLang === 'python' ? 'python3 main.py' : 'node main.mjs'}\n\nAll examples were executed during verification. See verification-report.json.\n`, { name: 'README.md' });
  z.append(JSON.stringify({ summary: c.summary, snippets: c.snippets.map(({ id, name, status, ms, attempts }) => ({ id, name, status, ms, attempts: attempts.length })) }, null, 2), { name: 'verification-report.json' });
});
export const exercisesZip = (course, c) => zip(z => {
  const f = fileOf(c.runnerLang ?? 'java');
  c.exercises.forEach((x, i) => { const dir = `exercise-${i + 1}-${slug(x.title)}`; z.append(`# ${x.title} (${x.difficulty})\n\n${x.statement}\n\nRun: ${c.runnerLang === 'java' ? 'java Main.java' : c.runnerLang === 'python' ? 'python3 main.py' : 'node main.mjs'}\nThe program prints PASS/FAIL for each test.\n`, { name: `${dir}/README.md` }); z.append(x.starter, { name: `${dir}/starter/${f}` }); z.append(x.solution, { name: `instructor-only/${dir}/solution/${f}` }); z.append(x.naive, { name: `instructor-only/${dir}/naive/${f}` }); });
});

export async function build(format, course, content, brand) {
  const base = slug(course.title);
  switch (format) {
    case 'pptx': return { name: `${base}.pptx`, type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', data: await pptx(course, content, brand) };
    case 'pdf': return { name: `${base}-slides.pdf`, type: 'application/pdf', data: await slidesPdf(course, content) };
    case 'notes': return { name: `${base}-trainer-notes.pdf`, type: 'application/pdf', data: await notesPdf(course, content) };
    case 'quiz': return { name: `${base}-quiz.pdf`, type: 'application/pdf', data: await quizPdf(course, content) };
    case 'cheat': return { name: `${base}-cheat-sheet.pdf`, type: 'application/pdf', data: await cheatPdf(course, content) };
    case 'report': return { name: `${base}-verification-report.pdf`, type: 'application/pdf', data: await reportPdf(course, content) };
    case 'code': return { name: `${base}-code.zip`, type: 'application/zip', data: await codeZip(course, content) };
    case 'exercises': return { name: `${base}-exercises.zip`, type: 'application/zip', data: await exercisesZip(course, content) };
    case 'package': {
      const parts = await Promise.all(['pptx', 'pdf', 'notes', 'quiz', 'cheat', 'report', 'code', 'exercises'].map(f => build(f, course, content, brand)));
      const data = await zip(z => parts.forEach(p => z.append(p.data, { name: p.name })));
      return { name: `${base}-full-package.zip`, type: 'application/zip', data };
    }
    default: throw new Error(`Unknown export format: ${format}`);
  }
}
