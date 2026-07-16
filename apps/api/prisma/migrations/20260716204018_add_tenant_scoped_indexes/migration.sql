-- CreateIndex
CREATE INDEX "approvals_tenantId_projectId_idx" ON "approvals"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "invoices_tenantId_projectId_idx" ON "invoices"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "portal_messages_tenantId_projectId_idx" ON "portal_messages"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "project_files_tenantId_projectId_idx" ON "project_files"("tenantId", "projectId");
