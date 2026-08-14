-- AlterTable
ALTER TABLE "services" ADD COLUMN     "categoryLabel" TEXT,
ADD COLUMN     "categorySlug" TEXT;

-- CreateIndex
CREATE INDEX "services_tenantId_categorySlug_idx" ON "services"("tenantId", "categorySlug");
