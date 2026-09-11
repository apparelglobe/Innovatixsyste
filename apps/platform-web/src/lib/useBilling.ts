'use client';

/**
 * Slice 6 — the client Billing History data hook. Hits the dedicated OWNER-only GET /portal/billing (all
 * projects + org retainers, non-DRAFT), with tab + project filters and keyset pagination, plus per-currency
 * relationship aggregates and the Care Plan (one request powers the whole page). Pairs with useRelationship
 * for me/org/canBilling + the project list — it deliberately does NOT load the legacy /portal/project.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiJson } from './portal-api';

export type BillingTab = 'all' | 'unpaid' | 'paid' | 'overdue';

export type BillingInvoice = {
  id: string; number: string; kind: string; status: string; overdue: boolean;
  amountCents: number; currency: string;
  issuedAt: string | null; dueAt: string | null; paidAt: string | null; createdAt: string;
  projectId: string | null; projectName: string | null;
  billingPeriodStart: string | null; billingPeriodEnd: string | null;
};
export type CurrencyAggregate = { lifetimePaidCents: number; outstandingCents: number; overdueCount: number; counts: { paid: number; unpaid: number; overdue: number; voided: number } };
export type BillingAggregates = { byCurrency: Record<string, CurrencyAggregate> };
export type BillingCarePlan = { name: string; monthlyAmountCents: number; currency: string; status: 'ACTIVE' | 'PAUSED' | 'PAST_DUE' | 'COMPLETED' | 'CANCELED'; nextInvoiceAt: string | null; includedSummary: string | null };

type Res = { ok: boolean; invoices: BillingInvoice[]; nextCursor: string | null; aggregates: BillingAggregates; carePlan: BillingCarePlan | null };

export function useBilling() {
  const [invoices, setInvoices] = useState<BillingInvoice[] | undefined>(undefined); // undefined = loading
  const [aggregates, setAggregates] = useState<BillingAggregates>({ byCurrency: {} });
  const [carePlan, setCarePlan] = useState<BillingCarePlan | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [tab, setTab] = useState<BillingTab>('all');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState(false);
  // Monotonic request id: only the latest (re)load may commit, so a slow response for an old tab/project
  // can never overwrite a newer view, and an in-flight "load more" for a superseded filter is discarded.
  const reqId = useRef(0);

  const qs = (t: BillingTab, pid: string | null, cursor?: string) => {
    const q = new URLSearchParams();
    if (t !== 'all') q.set('status', t);
    if (pid) q.set('projectId', pid);
    if (cursor) q.set('cursor', cursor);
    return q.toString() ? `?${q.toString()}` : '';
  };

  const load = useCallback(async (t: BillingTab, pid: string | null) => {
    const my = ++reqId.current;
    setInvoices(undefined);
    setNextCursor(null); // hide Load-more during a reload so it can't fire with a stale cursor
    const r = await apiJson<Res>(`/portal/billing${qs(t, pid)}`);
    if (my !== reqId.current) return; // superseded by a newer load
    setStatus(r.status);
    if (r.status === 200) {
      setInvoices(r.body.invoices);
      setNextCursor(r.body.nextCursor);
      setAggregates(r.body.aggregates ?? { byCurrency: {} });
      setCarePlan(r.body.carePlan ?? null);
    } else {
      setInvoices([]);
    }
  }, []);
  useEffect(() => { load(tab, projectId); }, [load, tab, projectId]);

  const more = useCallback(async () => {
    if (!nextCursor) return;
    const my = reqId.current;
    setLoadingMore(true);
    // try/finally so a network-level fetch REJECTION (offline/reset/TLS — not an HTTP error, which apiJson
    // resolves) can't leave loadingMore latched true and the Load-more button permanently disabled.
    try {
      const r = await apiJson<Res>(`/portal/billing${qs(tab, projectId, nextCursor)}`);
      if (my === reqId.current && r.status === 200) { // ignore if the filter changed mid-request
        setInvoices((prev) => [...(prev ?? []), ...r.body.invoices]);
        setNextCursor(r.body.nextCursor);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, tab, projectId]);

  return { invoices, aggregates, carePlan, nextCursor, more, loadingMore, tab, setTab, projectId, setProjectId, status };
}
