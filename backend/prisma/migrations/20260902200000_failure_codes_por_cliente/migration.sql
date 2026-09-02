-- DropIndex
DROP INDEX "failure_codes_code_key";

-- AlterTable
ALTER TABLE "failure_codes" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE INDEX "failure_codes_clientId_idx" ON "failure_codes"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "failure_codes_clientId_code_key" ON "failure_codes"("clientId", "code");

-- AddForeignKey
ALTER TABLE "failure_codes" ADD CONSTRAINT "failure_codes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
