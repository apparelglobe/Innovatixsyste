-- Slice 3 — client support tickets. Purely ADDITIVE: two new enums, two new tables, two enum values.
-- Low risk (no backfill, no change to existing tables). The new JobType/NotificationType values are NOT
-- used anywhere in this migration, so the enum ADD VALUEs are safe inside the migration transaction (PG12+).

-- New enums
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CLIENT', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketCategory" AS ENUM ('GENERAL', 'PROJECT', 'BILLING', 'TECHNICAL', 'CARE_PLAN', 'OTHER');

-- Extend existing enums (values unused within this migration)
ALTER TYPE "JobType" ADD VALUE 'TICKET_NOTIFY';
ALTER TYPE "NotificationType" ADD VALUE 'TICKET_MESSAGE';

-- tickets
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientOrgId" TEXT NOT NULL,
    "projectId" TEXT,
    "number" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdByClientUserId" TEXT NOT NULL,
    "createdByName" TEXT,
    "clientRequestId" TEXT,
    "requestHash" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- ticket_messages
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorType" "MessageAuthorType" NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "clientRequestId" TEXT,
    "requestHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- Uniques + indexes (nullable clientRequestId → Postgres treats NULLs as distinct → partial-unique)
CREATE UNIQUE INDEX "tickets_tenantId_number_key" ON "tickets"("tenantId", "number");
CREATE UNIQUE INDEX "tickets_clientOrgId_clientRequestId_key" ON "tickets"("clientOrgId", "clientRequestId");
CREATE INDEX "tickets_tenantId_clientOrgId_status_lastMessageAt_idx" ON "tickets"("tenantId", "clientOrgId", "status", "lastMessageAt");
CREATE UNIQUE INDEX "ticket_messages_ticketId_clientRequestId_key" ON "ticket_messages"("ticketId", "clientRequestId");
CREATE INDEX "ticket_messages_ticketId_createdAt_idx" ON "ticket_messages"("ticketId", "createdAt");

-- Foreign keys. clientOrg = RESTRICT (org ownership durable); project = SET NULL (support survives project
-- deletion — link clears, history stays); ticket = RESTRICT (messages block ticket hard-delete).
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_clientOrgId_fkey" FOREIGN KEY ("clientOrgId") REFERENCES "client_orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
