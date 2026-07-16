-- CreateTable
CREATE TABLE "client_invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientOrgId" TEXT NOT NULL,
    "leadId" TEXT,
    "email" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "ClientUserRole" NOT NULL DEFAULT 'MEMBER',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdByStaffUserId" TEXT,
    "lastSentAt" TIMESTAMP(3),
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_invitations_tokenHash_key" ON "client_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "client_invitations_tenantId_normalizedEmail_idx" ON "client_invitations"("tenantId", "normalizedEmail");

-- CreateIndex
CREATE INDEX "client_invitations_tenantId_clientOrgId_idx" ON "client_invitations"("tenantId", "clientOrgId");

-- CreateIndex
CREATE INDEX "client_invitations_expiresAt_idx" ON "client_invitations"("expiresAt");
