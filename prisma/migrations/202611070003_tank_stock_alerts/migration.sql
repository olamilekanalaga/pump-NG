-- AlterTable
ALTER TABLE "Nozzle" ADD COLUMN     "tankId" TEXT;

-- AlterTable
ALTER TABLE "OperationalAlert" ADD COLUMN     "alertKey" TEXT;

-- CreateTable
CREATE TABLE "FuelTank" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "capacityLitres" DECIMAL(18,3) NOT NULL,
    "reorderPercent" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelTank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TankStockReading" (
    "id" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "litres" DECIMAL(18,3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "eventId" TEXT,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TankStockReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FuelTank_stationId_idx" ON "FuelTank"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "TankStockReading_eventId_key" ON "TankStockReading"("eventId");

-- CreateIndex
CREATE INDEX "TankStockReading_tankId_recordedAt_idx" ON "TankStockReading"("tankId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OperationalAlert_alertKey_key" ON "OperationalAlert"("alertKey");

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "FuelTank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTank" ADD CONSTRAINT "FuelTank_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelTank" ADD CONSTRAINT "FuelTank_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FuelProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankStockReading" ADD CONSTRAINT "TankStockReading_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankStockReading" ADD CONSTRAINT "TankStockReading_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "IngestionEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

