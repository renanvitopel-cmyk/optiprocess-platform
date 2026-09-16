-- AlterTable
ALTER TABLE "calibration_points" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "performed" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "standardValue" DROP NOT NULL,
ALTER COLUMN "indicatedValue" DROP NOT NULL,
ALTER COLUMN "error" DROP NOT NULL,
ALTER COLUMN "tolerance" DROP NOT NULL,
ALTER COLUMN "uncertainty" DROP NOT NULL,
ALTER COLUMN "result" DROP NOT NULL;
