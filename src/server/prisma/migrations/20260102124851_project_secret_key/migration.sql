/*
  Warnings:

  - A unique constraint covering the columns `[secretKey]` on the table `project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "project" ADD COLUMN     "secretKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "project_secretKey_key" ON "project"("secretKey");
