'use client';

/**
 * Slice 5 — shared ticket-attachment UI (client + admin). Renders attachment chips under a message: a clean
 * (AVAILABLE) file is a cookie-authed download link; a not-yet-safe file (SCANNING/QUARANTINED/REJECTED) is a
 * NON-clickable chip with a scan-status indicator — the server never lets an unsafe file download anyway.
 * A tiny file-picker + list is provided for the composers (one file per message).
 */
import { Paperclip, Download, ShieldAlert, Loader2, X } from 'lucide-react';

export type UIAttachment = { id: string; filename: string; sizeBytes: number | null; downloadable: boolean; state?: string };

export function fmtBytes(n: number | null): string {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const scanLabel = (a: UIAttachment): string =>
  a.state === 'QUARANTINED' ? 'Blocked (failed scan)' : a.state === 'REJECTED' ? 'Rejected' : 'Scanning…';

/** Read-only attachment list under a message. `downloadHref(a)` yields the scoped download URL. */
export function TicketAttachmentList({ attachments, downloadHref }: { attachments: UIAttachment[]; downloadHref: (a: UIAttachment) => string }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((a) =>
        a.downloadable ? (
          <a key={a.id} href={downloadHref(a)} className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-base px-2.5 py-1 text-xs text-neutral-200 transition hover:bg-white/[0.05]">
            <Paperclip size={12} className="text-neutral-500" /> <span className="max-w-[200px] truncate">{a.filename}</span>
            {a.sizeBytes != null && <span className="text-neutral-500">{fmtBytes(a.sizeBytes)}</span>}
            <Download size={12} className="text-neutral-500" />
          </a>
        ) : (
          <span key={a.id} title="This file isn't available yet." className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-neutral-400">
            <Paperclip size={12} /> <span className="max-w-[200px] truncate">{a.filename}</span>
            <span className={`inline-flex items-center gap-1 ${a.state === 'QUARANTINED' || a.state === 'REJECTED' ? 'text-red-400' : 'text-amber-300'}`}>
              {a.state === 'QUARANTINED' || a.state === 'REJECTED' ? <ShieldAlert size={11} /> : <Loader2 size={11} className="animate-spin" />} {scanLabel(a)}
            </span>
          </span>
        ),
      )}
    </div>
  );
}

/** Composer file picker (one file). Shows the chosen file with a clear button; parent owns the File state. */
export function AttachmentPicker({ file, onPick, tone = 'primary' }: { file: File | null; onPick: (f: File | null) => void; tone?: 'primary' | 'amber' }) {
  const ring = tone === 'amber' ? 'file:bg-amber-500/80 hover:file:bg-amber-500' : 'file:bg-primary hover:file:bg-primary-dark';
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        type="file"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className={`text-xs text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white ${ring}`}
      />
      {file && (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-base px-2.5 py-1 text-xs text-neutral-200">
          <Paperclip size={12} className="text-neutral-500" /> <span className="max-w-[180px] truncate">{file.name}</span>
          <span className="text-neutral-500">{fmtBytes(file.size)}</span>
          <button type="button" onClick={() => onPick(null)} className="text-neutral-500 hover:text-white"><X size={12} /></button>
        </span>
      )}
    </div>
  );
}
