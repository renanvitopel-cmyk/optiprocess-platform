-- AlterTable
ALTER TABLE "calibration_standards" ADD COLUMN     "referenceStandardId" TEXT;

-- CreateTable
CREATE TABLE "reference_standards" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "measurementRange" TEXT,
    "resolution" TEXT,
    "unit" TEXT,
    "photoKey" TEXT,
    "photoFileName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "reference_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_standard_certificates" (
    "id" TEXT NOT NULL,
    "referenceStandardId" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "laboratory" TEXT,
    "calibrationDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "fileKey" TEXT,
    "fileFileName" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reference_standard_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reference_standards_active_idx" ON "reference_standards"("active");

-- CreateIndex
CREATE INDEX "reference_standard_certificates_referenceStandardId_idx" ON "reference_standard_certificates"("referenceStandardId");

-- CreateIndex
CREATE INDEX "reference_standard_certificates_validUntil_idx" ON "reference_standard_certificates"("validUntil");

-- CreateIndex
CREATE INDEX "calibration_standards_referenceStandardId_idx" ON "calibration_standards"("referenceStandardId");

-- AddForeignKey
ALTER TABLE "calibration_standards" ADD CONSTRAINT "calibration_standards_referenceStandardId_fkey" FOREIGN KEY ("referenceStandardId") REFERENCES "reference_standards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_standard_certificates" ADD CONSTRAINT "reference_standard_certificates_referenceStandardId_fkey" FOREIGN KEY ("referenceStandardId") REFERENCES "reference_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
