-- CreateEnum
CREATE TYPE "ToleranceMode" AS ENUM ('PERCENT_FULL_SCALE', 'PERCENT_READING', 'ABSOLUTE');

-- CreateEnum
CREATE TYPE "UncertaintyMode" AS ENUM ('ABSOLUTE', 'PERCENT_READING');

-- CreateEnum
CREATE TYPE "DecisionRule" AS ENUM ('SIMPLE', 'GUARD_BAND');

-- AlterTable
ALTER TABLE "calibration_points" ADD COLUMN     "toleranceCalculated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "uCombined" DOUBLE PRECISION,
ADD COLUMN     "uRepeatability" DOUBLE PRECISION,
ADD COLUMN     "uResolution" DOUBLE PRECISION,
ADD COLUMN     "uStandard" DOUBLE PRECISION,
ADD COLUMN     "uncertaintyCalculated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "calibration_standards" ADD COLUMN     "expandedUncertainty" DOUBLE PRECISION,
ADD COLUMN     "uncertaintyK" DOUBLE PRECISION,
ADD COLUMN     "uncertaintyMode" "UncertaintyMode";

-- AlterTable
ALTER TABLE "calibrations" ADD COLUMN     "decisionRule" "DecisionRule" NOT NULL DEFAULT 'SIMPLE';

-- AlterTable
ALTER TABLE "instruments" ADD COLUMN     "accuracyClass" TEXT,
ADD COLUMN     "rangeMax" DOUBLE PRECISION,
ADD COLUMN     "rangeMin" DOUBLE PRECISION,
ADD COLUMN     "resolutionValue" DOUBLE PRECISION,
ADD COLUMN     "toleranceMode" "ToleranceMode",
ADD COLUMN     "toleranceValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "reference_standard_certificates" ADD COLUMN     "expandedUncertainty" DOUBLE PRECISION,
ADD COLUMN     "uncertaintyK" DOUBLE PRECISION,
ADD COLUMN     "uncertaintyMode" "UncertaintyMode";
