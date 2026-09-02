-- CreateEnum
CREATE TYPE "AttachmentCategory" AS ENUM ('LOCATION', 'INSTRUMENT', 'STANDARD', 'MEASUREMENT', 'DOCUMENT', 'OTHER');

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "category" "AttachmentCategory" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "calibrations" ADD COLUMN     "coverageFactorK" DOUBLE PRECISION DEFAULT 2,
ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "procedure" TEXT,
ALTER COLUMN "standardUsed" DROP NOT NULL,
ALTER COLUMN "traceability" DROP NOT NULL;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "contractedServices" "ServiceCategory"[];

-- CreateTable
CREATE TABLE "calibration_standards" (
    "id" TEXT NOT NULL,
    "calibrationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "certificateNumber" TEXT,
    "certificateValidUntil" TIMESTAMP(3),
    "laboratory" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "calibration_standards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calibration_standards_calibrationId_idx" ON "calibration_standards"("calibrationId");

-- AddForeignKey
ALTER TABLE "calibration_standards" ADD CONSTRAINT "calibration_standards_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES "calibrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
