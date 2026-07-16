-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'DELIVERY_LEAD', 'ENGINEER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('MILESTONE', 'DELIVERABLE', 'UAT', 'CHANGE_REQUEST', 'DEPLOYMENT');

-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('CLIENT', 'STAFF');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REPORT_PUBLISHED', 'MILESTONE_UPDATED', 'APPROVAL_REQUESTED', 'APPROVAL_COMPLETED', 'FILE_UPLOADED', 'CLIENT_MESSAGE', 'TEAM_MESSAGE', 'INVOICE_CREATED', 'INVOICE_DUE', 'PROJECT_STATUS_CHANGED');

-- AlterTable
ALTER TABLE "approvals" ADD COLUMN     "relatedId" TEXT,
ADD COLUMN     "relatedType" TEXT,
ADD COLUMN     "requestedByStaffId" TEXT,
ADD COLUMN     "type" "ApprovalType" NOT NULL DEFAULT 'MILESTONE';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "billingContactUserId" TEXT,
ADD COLUMN     "paymentUrl" TEXT,
ADD COLUMN     "pdfKey" TEXT;

-- AlterTable
ALTER TABLE "portal_messages" ADD COLUMN     "authorStaffId" TEXT,
ADD COLUMN     "internal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readByClientAt" TIMESTAMP(3),
ADD COLUMN     "readByTeamAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "project_files" ADD COLUMN     "clientVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "storageProvider" TEXT,
ADD COLUMN     "uploadedByStaffId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "project_members" ADD COLUMN     "clientVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "staffUserId" TEXT;

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "milestoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "StaffRole" NOT NULL DEFAULT 'ENGINEER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recipientType" "RecipientType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "linkPath" TEXT,
    "projectId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_line_items_invoiceId_idx" ON "invoice_line_items"("invoiceId");

-- CreateIndex
CREATE INDEX "staff_users_tenantId_role_idx" ON "staff_users"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_tenantId_normalizedEmail_key" ON "staff_users"("tenantId", "normalizedEmail");

-- CreateIndex
CREATE INDEX "notifications_tenantId_recipientType_recipientId_read_idx" ON "notifications"("tenantId", "recipientType", "recipientId", "read");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
