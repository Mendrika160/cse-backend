-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'BENEFICIARY');

-- CreateEnum
CREATE TYPE "Resource" AS ENUM ('USER', 'BENEFICIARY', 'HELP_REQUEST', 'BUDGET', 'AUDIT_LOG');

-- CreateEnum
CREATE TYPE "Action" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT', 'PAY', 'MANAGE');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" "UserRole" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" "Resource" NOT NULL,
    "action" "Action" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- Seed default roles
INSERT INTO "roles" ("id", "code", "label", "description", "createdAt", "updatedAt")
VALUES
  ('role_admin', 'ADMIN', 'Administrator', 'Platform administrators', NOW(), NOW()),
  ('role_manager', 'MANAGER', 'Manager', 'Can validate and pay requests', NOW(), NOW()),
  ('role_beneficiary', 'BENEFICIARY', 'Beneficiary', 'Can create and manage own requests', NOW(), NOW());

-- AlterTable (safe migration path for existing users)
ALTER TABLE "users" ADD COLUMN "roleId" TEXT;

-- Backfill users.roleId from legacy users.role
UPDATE "users"
SET "roleId" = CASE "role"::text
  WHEN 'ADMIN' THEN 'role_admin'
  WHEN 'MANAGER' THEN 'role_manager'
  ELSE 'role_beneficiary'
END;

-- Ensure roleId is required after backfill
ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop legacy role column and enum
ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE "Role";
