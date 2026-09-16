-- AlterTable
ALTER TABLE "calibration_points" ADD COLUMN     "deviation" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "calibration_readings" (
    "id" TEXT NOT NULL,
    "calibrationPointId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "calibration_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calibration_readings_calibrationPointId_idx" ON "calibration_readings"("calibrationPointId");

-- AddForeignKey
ALTER TABLE "calibration_readings" ADD CONSTRAINT "calibration_readings_calibrationPointId_fkey" FOREIGN KEY ("calibrationPointId") REFERENCES "calibration_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;
