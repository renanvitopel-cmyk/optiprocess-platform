-- AlterTable
ALTER TABLE "calibration_points" ADD COLUMN     "instrumentCalibrationPointId" TEXT,
ADD COLUMN     "label" TEXT;

-- CreateTable
CREATE TABLE "instrument_calibration_points" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "measurementRange" TEXT,
    "unit" TEXT,
    "calibrationFrequencyMonths" INTEGER,
    "lastCalibrationDate" TIMESTAMP(3),
    "nextDueDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "instrument_calibration_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instrument_calibration_points_instrumentId_idx" ON "instrument_calibration_points"("instrumentId");

-- CreateIndex
CREATE INDEX "instrument_calibration_points_nextDueDate_idx" ON "instrument_calibration_points"("nextDueDate");

-- CreateIndex
CREATE INDEX "calibration_points_instrumentCalibrationPointId_idx" ON "calibration_points"("instrumentCalibrationPointId");

-- AddForeignKey
ALTER TABLE "instrument_calibration_points" ADD CONSTRAINT "instrument_calibration_points_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_points" ADD CONSTRAINT "calibration_points_instrumentCalibrationPointId_fkey" FOREIGN KEY ("instrumentCalibrationPointId") REFERENCES "instrument_calibration_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;
