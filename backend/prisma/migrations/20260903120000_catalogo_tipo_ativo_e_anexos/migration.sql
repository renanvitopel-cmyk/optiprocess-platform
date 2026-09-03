-- AlterEnum
ALTER TYPE "AttachmentEntityType" ADD VALUE 'INSTRUMENT';

-- CreateTable
CREATE TABLE "asset_types" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_types_clientId_idx" ON "asset_types"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_types_clientId_name_key" ON "asset_types"("clientId", "name");

-- AddForeignKey
ALTER TABLE "asset_types" ADD CONSTRAINT "asset_types_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
