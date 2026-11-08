CREATE TABLE "DailyFuelCheck" (
 "id" TEXT NOT NULL,
 "stationId" TEXT NOT NULL,
 "date" TEXT NOT NULL,
 "state" JSONB NOT NULL,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "DailyFuelCheck_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "DailyFuelCheck_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DailyFuelCheck_stationId_date_key" ON "DailyFuelCheck"("stationId","date");
