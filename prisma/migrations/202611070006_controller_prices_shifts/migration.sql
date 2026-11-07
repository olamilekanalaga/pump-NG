-- AlterTable
ALTER TABLE "StationFuelPrice" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdByLabel" TEXT NOT NULL DEFAULT 'Provider',
ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'PROVIDER';

-- CreateTable
CREATE TABLE "ShiftReconciliation" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "cashReceived" DECIMAL(18,2),
    "posReceived" DECIMAL(18,2),
    "transferReceived" DECIMAL(18,2),
    "expectedSales" DECIMAL(18,2),
    "calculation" JSONB,
    "lockedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShiftReconciliation_stationId_startAt_endAt_key" ON "ShiftReconciliation"("stationId", "startAt", "endAt");

-- AddForeignKey
ALTER TABLE "StationFuelPrice" ADD CONSTRAINT "StationFuelPrice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftReconciliation" ADD CONSTRAINT "ShiftReconciliation_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftReconciliation" ADD CONSTRAINT "ShiftReconciliation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

