-- AlterTable
ALTER TABLE "MeterSnapshot" ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "sourceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MeterSnapshot_eventId_key" ON "MeterSnapshot"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "MeterSnapshot_sourceId_externalId_key" ON "MeterSnapshot"("sourceId", "externalId");

-- AddForeignKey
ALTER TABLE "MeterSnapshot" ADD CONSTRAINT "MeterSnapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeterSnapshot" ADD CONSTRAINT "MeterSnapshot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "IngestionEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

