// Zero-dependency signed-agreement PDF renderer — mirrors billing/pdf.ts.
// Hand-assembles a valid multi-page PDF (Helvetica) from the stored agreement text
// + signature evidence. Rendered ON DEMAND (never stored): the DB holds the source
// of truth (contract body + signature), and this reproduces it identically each time.
// In production a real renderer (headless-Chrome) could replace this behind the same
// signature, exactly as billing/pdf.ts anticipates.

export type ContractSignatureBlock = {
  signerName: string; signerEmail: string; signerTitle: string | null;
  signedAt: Date | string | null; ipHash: string | null; contentHash: string | null;
};
export type ContractPdfInput = {
  number: string; title: string; orgName: string; proposalNumber: string | null;
  bodyMarkdown: string; signature: ContractSignatureBlock | null;
};

// PDF strings must escape \ ( ) and drop control / non-Latin chars.
const esc = (s: string) => String(s).replace(/[\\()]/g, (c) => `\\${c}`).replace(/[\r\n\t]/g, ' ').replace(/[^\x20-\x7E]/g, '');
function text(x: number, y: number, size: number, s: string, bold = false) {
  return `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET\n`;
}
function wrap(s: string, max: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

type RLine = { text: string; size: number; bold: boolean; indent: number; gapBefore: number };

/** Turn the agreement markdown (+ signature) into positioned render-lines. */
function layout(body: string, signature: ContractSignatureBlock | null): RLine[] {
  const lines: RLine[] = [];
  for (const raw of body.split('\n')) {
    const l = raw.replace(/\*\*/g, ''); // inline bold markers → plain
    if (l.trim() === '') { lines.push({ text: '', size: 6, bold: false, indent: 0, gapBefore: 5 }); continue; }
    if (l.startsWith('# ')) { lines.push({ text: l.slice(2), size: 17, bold: true, indent: 0, gapBefore: 6 }); continue; }
    if (l.startsWith('## ')) { lines.push({ text: l.slice(3), size: 12, bold: true, indent: 0, gapBefore: 11 }); continue; }
    if (l.startsWith('- ')) {
      const parts = wrap(l.slice(2), 86);
      parts.forEach((w, i) => lines.push({ text: (i === 0 ? '•  ' : '   ') + w, size: 10, bold: false, indent: 10, gapBefore: i === 0 ? 3 : 1 }));
      continue;
    }
    wrap(l, 92).forEach((w, i) => lines.push({ text: w, size: 10, bold: false, indent: 0, gapBefore: i === 0 ? 3 : 1 }));
  }
  if (signature) {
    const when = signature.signedAt ? new Date(signature.signedAt).toUTCString() : '—';
    lines.push({ text: '', size: 6, bold: false, indent: 0, gapBefore: 18 });
    lines.push({ text: 'SIGNATURE', size: 10, bold: true, indent: 0, gapBefore: 2 });
    lines.push({ text: `Signed by ${signature.signerName}${signature.signerTitle ? `, ${signature.signerTitle}` : ''}`, size: 11, bold: false, indent: 0, gapBefore: 9 });
    lines.push({ text: signature.signerEmail, size: 9, bold: false, indent: 0, gapBefore: 3 });
    lines.push({ text: `Signed: ${when}`, size: 9, bold: false, indent: 0, gapBefore: 3 });
    if (signature.contentHash) lines.push({ text: `Verification ID: ${signature.contentHash.slice(0, 32)}`, size: 8, bold: false, indent: 0, gapBefore: 3 });
    if (signature.ipHash) lines.push({ text: `Signer IP verified (hashed): ${signature.ipHash.slice(0, 20)}`, size: 8, bold: false, indent: 0, gapBefore: 2 });
    lines.push({ text: 'This document records a legally binding electronic signature (ESIGN / UETA).', size: 8, bold: false, indent: 0, gapBefore: 6 });
  }
  return lines;
}

export function renderContractPdf(input: ContractPdfInput): Buffer {
  const W = 612, H = 792, TOP = 748, BOTTOM = 58, LEFT = 56;
  const rlines = layout(input.bodyMarkdown, input.signature);
  const pages: string[] = [];
  let body = '';
  let y = TOP;

  const header = () => {
    body = '1 w\n';
    y = TOP;
    body += text(LEFT, y, 18, 'Innovatix Systems', true); y -= 13;
    body += text(LEFT, y, 8, `Services Agreement · ${input.number}`); y -= 22;
  };
  const footer = () => { body += text(LEFT, 38, 8, `${input.number} · Confidential · Innovatix Systems`); };

  header();
  for (const rl of rlines) {
    y -= rl.gapBefore;
    const lineH = rl.size + 3;
    if (y - lineH < BOTTOM) { footer(); pages.push(body); header(); }
    if (rl.text !== '') body += text(LEFT + rl.indent, y, rl.size, rl.text, rl.bold);
    y -= lineH;
  }
  footer();
  pages.push(body);

  const N = pages.length;
  const objs: string[] = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const kids = Array.from({ length: N }, (_, i) => `${5 + N + i} 0 R`).join(' ');
  objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${N} >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  for (let i = 0; i < N; i++) {
    const content = pages[i];
    objs[5 + i] = `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`;
  }
  for (let i = 0; i < N; i++) {
    objs[5 + N + i] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${5 + i} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`;
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = Buffer.byteLength(pdf);
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(pdf);
  const count = objs.length;
  pdf += `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}
