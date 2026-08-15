-- AlterTable
ALTER TABLE "proposals" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "projectId" TEXT;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
