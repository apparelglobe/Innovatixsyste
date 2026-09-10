-- Slice 5 — ticket attachments. Purely ADDITIVE: two NEW tables only. No new enum (reuses FileState,
-- JobStatus, ScanResult), NO backfill, and NO alteration of project_files or file_scans (the deployed
-- malware gate is untouched). Safe against the from-empty rebuild trap — only CREATE TABLEs with no
-- ordering dependency on prior columns.

-- ticket_attachments — project-LESS, org-owned (clientOrgId FK), message-bound. Fail-closed state default.
CREATE TABLE "ticket_attachments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientOrgId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "storageProvider" TEXT,
    "storageKey" TEXT,
    "state" "FileState" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "fileHash" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- ticket_attachment_scans — sibling of file_scans (durable job + evidence). Reuses JobStatus/ScanResult.
CREATE TABLE "ticket_attachment_scans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "errorCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT,
    "engine" TEXT,
    "engineVersion" TEXT,
    "signatureVersion" TEXT,
    "result" "ScanResult",
    "threatName" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "fileHash" TEXT,
    "fileSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_attachment_scans_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "ticket_attachments_tenantId_ticketId_idx" ON "ticket_attachments"("tenantId", "ticketId");
CREATE INDEX "ticket_attachments_messageId_idx" ON "ticket_attachments"("messageId");
CREATE INDEX "ticket_attachments_clientOrgId_ticketId_idx" ON "ticket_attachments"("clientOrgId", "ticketId");
CREATE UNIQUE INDEX "ticket_attachment_scans_idempotencyKey_key" ON "ticket_attachment_scans"("idempotencyKey");
CREATE INDEX "ticket_attachment_scans_status_nextAttemptAt_idx" ON "ticket_attachment_scans"("status", "nextAttemptAt");
CREATE INDEX "ticket_attachment_scans_attachmentId_idx" ON "ticket_attachment_scans"("attachmentId");

-- Foreign keys. All ON DELETE RESTRICT: clientOrg (durable org ownership, structurally enforced per lock F),
-- ticket (attachments block ticket hard-delete → support history never cascaded away), message (visual/
-- visibility parent), attachment→scan. Project deletion never touches attachments (no projectId column).
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_clientOrgId_fkey" FOREIGN KEY ("clientOrgId") REFERENCES "client_orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ticket_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_attachment_scans" ADD CONSTRAINT "ticket_attachment_scans_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "ticket_attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
