-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('CLEAN', 'INFECTED', 'ERROR', 'TIMEOUT', 'UNSUPPORTED', 'SKIPPED');

-- AlterTable
ALTER TABLE "project_files" ADD COLUMN     "fileHash" TEXT;

-- CreateTable
CREATE TABLE "file_scans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
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

    CONSTRAINT "file_scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_scans_idempotencyKey_key" ON "file_scans"("idempotencyKey");

-- CreateIndex
CREATE INDEX "file_scans_status_nextAttemptAt_idx" ON "file_scans"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "file_scans_fileId_idx" ON "file_scans"("fileId");

-- AddForeignKey
ALTER TABLE "file_scans" ADD CONSTRAINT "file_scans_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "project_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
