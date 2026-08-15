'use client';

import { Check } from 'lucide-react';
import { RAIL, STAGE, TONE_CLASS, railIndex, type Stage } from '@/lib/proposal-stage';

/** Horizontal lifecycle track: Draft → Sent → Viewed → Accepted → Signed → Paid → Activated.
 *  Each node is a check ONLY if its own event is on record (`reached[step]`) — never inferred
 *  from a later stage. So a proposal accepted without a recorded view shows Viewed as *not* done. */
export function ProposalStatusRail({ stage, reached }: { stage: Stage; reached: Record<Stage, boolean> }) {
  const offPath = railIndex(stage) === null;
  // "Active" = the next step after the furthest recorded progress (not a position guess).
  const lastDone = RAIL.reduce((acc, s, i) => (reached[s] ? i : acc), -1);
  const activeIndex = offPath ? -1 : lastDone + 1;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      {offPath && (
        <span className={`mb-4 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[STAGE[stage].tone]}`}>
          {STAGE[stage].label}
        </span>
      )}
      <ol className="flex items-start overflow-x-auto pb-1">
        {RAIL.map((s, i) => {
          const done = reached[s];
          const active = i === activeIndex && !done;
          const last = i === RAIL.length - 1;
          const connectorDone = !last && reached[RAIL[i + 1]!];
          return (
            <li key={s} className={last ? 'flex items-start' : 'flex flex-1 items-start'}>
              <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'bg-indigo-500 text-white ring-4 ring-white/10'
                        : 'bg-white/10 text-neutral-500'
                  }`}
                >
                  {done ? <Check size={15} /> : i + 1}
                </span>
                <span className={`text-center text-[11px] font-medium leading-tight ${done ? 'text-neutral-200' : active ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  {STAGE[s].label}
                </span>
              </div>
              {!last && <span className={`mx-0.5 mt-3.5 h-0.5 flex-1 rounded ${connectorDone ? 'bg-emerald-500/60' : 'bg-white/10'}`} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
