-- AlterTable
ALTER TABLE "instrument_calibration_points" ADD COLUMN     "sensorTypeId" TEXT;

-- CreateTable
CREATE TABLE "sensor_types" (
    "id" TEXT NOT NULL,
    "measurementTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sensor_types_measurementTypeId_name_key" ON "sensor_types"("measurementTypeId", "name");

-- AddForeignKey
ALTER TABLE "instrument_calibration_points" ADD CONSTRAINT "instrument_calibration_points_sensorTypeId_fkey" FOREIGN KEY ("sensorTypeId") REFERENCES "sensor_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_types" ADD CONSTRAINT "sensor_types_measurementTypeId_fkey" FOREIGN KEY ("measurementTypeId") REFERENCES "measurement_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
