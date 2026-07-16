-- AlterTable
ALTER TABLE "project_files" ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rootId" TEXT,
ADD COLUMN     "scanStatus" TEXT NOT NULL DEFAULT 'clean';

-- CreateIndex
CREATE INDEX "project_files_rootId_idx" ON "project_files"("rootId");
