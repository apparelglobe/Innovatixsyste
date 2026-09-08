/**
 * Slice 2 — the ONLY sanctioned way to write a PortalActivity row.
 *
 * Ownership is enforced structurally, not by convention. There are exactly two entry points:
 *
 *   • PROJECT-scoped events — tenantId, clientOrgId AND projectId are ALL derived from a single
 *     authoritative `project` object the caller already holds (a scoped Project). A caller therefore
 *     cannot write a (projectId, clientOrgId) pair that disagrees: there is no separate org parameter.
 *
 *   • RELATIONSHIP-level events — projectId is ALWAYS null; tenantId + clientOrgId come from a trusted,
 *     caller-authoritative scope (session/org context), never from the request body.
 *
 * There is deliberately NO generic writer that accepts a free-form (projectId, clientOrgId) pair, and no
 * by-id variant: every current writer already holds its authoritative project, so none is needed (adding
 * one would reintroduce the mismatch risk this module exists to remove).
 *
 * Actors are SNAPSHOTS (actorType/actorId/actorName) — nullable, no FK. actorName is captured at write
 * time so the timeline survives rename/deactivation/deletion of the underlying user; actorId is a soft
 * reference never dereferenced for display.
 */
import type { ActorType, Prisma, PrismaClient } from '@prisma/client';

/** A snapshot actor. `name` is captured at event time; both id and name may be null (system/legacy). */
export type ActivityActor = { type: ActorType; id?: string | null; name?: string | null };

export const systemActor = (): ActivityActor => ({ type: 'SYSTEM', id: null, name: null });
export const clientActor = (id: string, name: string | null): ActivityActor => ({ type: 'CLIENT', id, name: name || null });
export const adminActor = (id: string, name: string | null): ActivityActor => ({ type: 'ADMIN', id, name: name || null });

export type ActivityInput = {
  type: string;
  message: string;
  /** Snapshot actor; omitted/null → legacy-neutral (all actor fields null). */
  actor?: ActivityActor | null;
  /** Deterministic primary key for idempotent moments (e.g. `retainer-activated:<carePlanId>`). */
  id?: string;
  /** Back-dated timestamp for synthesized/historical moments (activation backfill). */
  createdAt?: Date;
};

/** The authoritative project context a project-scoped activity is derived from. */
export type ProjectContext = { id: string; tenantId: string; clientOrgId: string };

/** A trusted relationship scope (org context, never request body). */
export type RelationshipScope = { tenantId: string; clientOrgId: string };

const actorFields = (actor?: ActivityActor | null) => ({
  actorType: actor?.type ?? null,
  actorId: actor?.id ?? null,
  actorName: actor?.name ?? null,
});

/**
 * Build the create payload for a PROJECT-scoped activity. tenantId, clientOrgId and projectId are all
 * taken from the one `project` object — they can never disagree, and there is no DB lookup. Returned as a
 * plain scalar payload usable by both `create({ data })` and `createMany({ data: [...] })`.
 */
export function buildProjectActivity(project: ProjectContext, input: ActivityInput): Prisma.PortalActivityCreateManyInput {
  return {
    ...(input.id ? { id: input.id } : {}),
    tenantId: project.tenantId,
    clientOrgId: project.clientOrgId,
    projectId: project.id,
    type: input.type,
    message: input.message,
    ...actorFields(input.actor),
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
  };
}

/** Build the create payload for a RELATIONSHIP-level activity — projectId is forced to null. */
export function buildRelationshipActivity(scope: RelationshipScope, input: ActivityInput): Prisma.PortalActivityCreateManyInput {
  return {
    ...(input.id ? { id: input.id } : {}),
    tenantId: scope.tenantId,
    clientOrgId: scope.clientOrgId,
    projectId: null,
    type: input.type,
    message: input.message,
    ...actorFields(input.actor),
    ...(input.createdAt ? { createdAt: input.createdAt } : {}),
  };
}

/** Accepts the base client or an interactive-transaction client. */
type ActivityDb = Pick<PrismaClient, 'portalActivity'> | Prisma.TransactionClient;

/** create(), swallowing the P2002 from a deterministic-id re-emit so idempotent moments are no-ops. */
async function createActivity(db: ActivityDb, data: Prisma.PortalActivityCreateManyInput, idempotent: boolean): Promise<void> {
  try {
    await db.portalActivity.create({ data });
  } catch (err) {
    if (idempotent && (err as { code?: string }).code === 'P2002') return; // already emitted (race / retry) → no-op
    throw err;
  }
}

/** Write a PROJECT-scoped activity. Idempotent when `input.id` is a deterministic key. */
export async function writeProjectActivity(db: ActivityDb, project: ProjectContext, input: ActivityInput): Promise<void> {
  await createActivity(db, buildProjectActivity(project, input), Boolean(input.id));
}

/** Write a RELATIONSHIP-level activity (projectId=null). Idempotent when `input.id` is deterministic. */
export async function writeRelationshipActivity(db: ActivityDb, scope: RelationshipScope, input: ActivityInput): Promise<void> {
  await createActivity(db, buildRelationshipActivity(scope, input), Boolean(input.id));
}
