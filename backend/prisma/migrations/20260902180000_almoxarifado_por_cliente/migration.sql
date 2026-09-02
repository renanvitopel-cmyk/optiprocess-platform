-- DropIndex
DROP INDEX "spare_parts_code_key";

-- AlterTable
ALTER TABLE "spare_parts" ADD COLUMN "clientId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "spare_parts_clientId_idx" ON "spare_parts"("clientId");

-- AddForeignKey
ALTER TABLE "spare_parts" ADD CONSTRAINT "spare_parts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
