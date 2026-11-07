-- CreateTable
CREATE TABLE "FuelDelivery" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tankId" TEXT,
    "sourceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "litres" DECIMAL(18,3) NOT NULL,
    "sellingPricePerLitre" DECIMAL(14,2),
    "orderReference" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationFuelPrice" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StationFuelPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FuelDelivery_eventId_key" ON "FuelDelivery"("eventId");

-- CreateIndex
CREATE INDEX "FuelDelivery_stationId_productId_receivedAt_idx" ON "FuelDelivery"("stationId", "productId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FuelDelivery_sourceId_externalId_key" ON "FuelDelivery"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "StationFuelPrice_eventId_key" ON "StationFuelPrice"("eventId");

-- CreateIndex
CREATE INDEX "StationFuelPrice_stationId_productId_effectiveAt_idx" ON "StationFuelPrice"("stationId", "productId", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "StationFuelPrice_sourceId_externalId_key" ON "StationFuelPrice"("sourceId", "externalId");

-- AddForeignKey
ALTER TABLE "FuelDelivery" ADD CONSTRAINT "FuelDelivery_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDelivery" ADD CONSTRAINT "FuelDelivery_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FuelProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDelivery" ADD CONSTRAINT "FuelDelivery_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "FuelTank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDelivery" ADD CONSTRAINT "FuelDelivery_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelDelivery" ADD CONSTRAINT "FuelDelivery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "IngestionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationFuelPrice" ADD CONSTRAINT "StationFuelPrice_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationFuelPrice" ADD CONSTRAINT "StationFuelPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FuelProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationFuelPrice" ADD CONSTRAINT "StationFuelPrice_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationFuelPrice" ADD CONSTRAINT "StationFuelPrice_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "IngestionEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

