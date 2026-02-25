-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

-- CreateTable
CREATE TABLE "help_requests" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "managerId" TEXT,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "help_requests_beneficiaryId_idx" ON "help_requests"("beneficiaryId");

-- CreateIndex
CREATE INDEX "help_requests_managerId_idx" ON "help_requests"("managerId");

-- CreateIndex
CREATE INDEX "help_requests_status_idx" ON "help_requests"("status");

-- AddForeignKey
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
