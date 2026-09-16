-- CreateEnum
CREATE TYPE "MeasurementFieldProfile" AS ENUM ('GENERIC', 'TEMPERATURE', 'SCALE');

-- AlterTable
ALTER TABLE "instrument_calibration_points" ADD COLUMN     "measurementTypeId" TEXT,
ADD COLUMN     "spanValue" DOUBLE PRECISION,
ADD COLUMN     "targetTemperature" DOUBLE PRECISION,
ADD COLUMN     "tolerancePercent" DOUBLE PRECISION,
ADD COLUMN     "zeroValue" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "measurement_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultUnit" TEXT,
    "fieldProfile" "MeasurementFieldProfile" NOT NULL DEFAULT 'GENERIC',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurement_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "measurement_types_name_key" ON "measurement_types"("name");

-- AddForeignKey
ALTER TABLE "instrument_calibration_points" ADD CONSTRAINT "instrument_calibration_points_measurementTypeId_fkey" FOREIGN KEY ("measurementTypeId") REFERENCES "measurement_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
