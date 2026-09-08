/**
 * Slice 2 — the curated activity timeline, shared by the Relationship Home (org-wide feed) and the
 * project detail page (that project's feed). Each row is styled by its moment TYPE (MOMENT_META) and
 * labelled by the stored, event-neutral PortalActivity.message; the author is rendered from the actorName
 * SNAPSHOT (never "you"), so attribution is consistent for every teammate and survives the author's
 * rename/deletion. Rows with no actorName (system/legacy) render with no byline — neutral, not invented.
 */
import { MOMENT_META, MOMENT_FALLBACK } from '@/lib/relationship-moment';
import { TONE_CLASS } from '@/lib/proposal-stage';
import { Timestamp } from '@/components/Timestamp';
import type { ActivityItem } from '@/lib/usePortal';

export function ActivityTimeline({ items, emptyLabel }: { items: ActivityItem[]; emptyLabel?: string }) {
  if (!items.length) return <p className="text-neutral-400">{emptyLabel ?? 'No activity yet.'}</p>;
  return (
    <ol className="space-y-3">
      {items.map((a) => {
        const meta = MOMENT_META[a.type] ?? MOMENT_FALLBACK;
        const Icon = meta.icon;
        return (
          <li key={a.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
            <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${TONE_CLASS[meta.tone]}`}>
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">{a.message}</div>
              <div className="mt-0.5 text-xs text-neutral-500">
                {a.actorName ? <span className="text-neutral-400">{a.actorName}</span> : null}
                {a.actorName ? ' · ' : ''}
                <Timestamp value={a.createdAt} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
