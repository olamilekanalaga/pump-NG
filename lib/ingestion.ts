import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from './db';
import { D, sale } from './domain';
import { syncTankAlerts } from './stock-alerts';
import { fuelCode } from './fuels';
const amount=(places:number)=>z.string().regex(new RegExp(`^\\d+(\\.\\d{1,${places}})?$`)).refine(v=>D(v).gt(0)&&D(v).lt('1000000000'),'Amount out of range');
export const transactionSchema=z.object({external_transaction_id:z.string().min(1).max(100),station_id:z.string().min(1).max(60),pump_id:z.string().min(1).max(60),nozzle_id:z.string().min(1).max(60),fuel_type:z.string().min(1).max(20).transform(fuelCode),litres:amount(3),price_per_litre:amount(2).optional(),sale_value:amount(2).optional(),started_at:z.iso.datetime().optional(),completed_at:z.iso.datetime(),source:z.enum(['simulator','external-api','mock-forecourt'])});
export type TransactionPayload=z.infer<typeof transactionSchema>;
export type IngestionResult={status:string;eventId:string;transactionId?:string;error?:string};
export async function ingest(raw: unknown,replayOf?:string):Promise<IngestionResult> {
 const event=await db.ingestionEvent.create({data:{raw:JSON.parse(JSON.stringify(raw ?? null)),replayOf}});
 try {
 const p=transactionSchema.parse(raw);

 if(p.started_at && new Date(p.started_at)>new Date(p.completed_at)) throw new Error('Start time follows completion');
 if(new Date(p.completed_at).getTime()>Date.now()+60000) throw new Error('Future completion timestamp');
 const source=await db.ingestionSource.findUnique({where:{stationId_name:{stationId:p.station_id,name:p.source}}});
 if(!source) throw new Error('Unregistered ingestion source or station');
 await db.ingestionEvent.update({where:{id:event.id},data:{sourceId:source.id}});
 if(!source.online) {await db.ingestionEvent.update({where:{id:event.id},data:{status:'QUEUED',error:'Source offline; restore connection and replay'}});return {status:'QUEUED',eventId:event.id};}
 const result=await db.$transaction(async tx=>{
 // Serialize a source to make concurrent replay and simulator meter updates safe.
 await tx.$queryRaw`SELECT id FROM "IngestionSource" WHERE id = ${source.id} FOR UPDATE`;
 const existing=await tx.fuelTransaction.findUnique({where:{sourceId_externalId:{sourceId:source.id,externalId:p.external_transaction_id}},include:{nozzle:{include:{dispenser:true}}}});
 if(existing){if(!existing.litres.eq(p.litres)||(p.price_per_litre!==undefined&&!existing.pricePerLitre.eq(p.price_per_litre))||existing.completedAt.toISOString()!==new Date(p.completed_at).toISOString()||existing.nozzle.code!==p.nozzle_id||existing.nozzle.dispenser.code!==p.pump_id||existing.nozzle.productId!==p.fuel_type||(p.sale_value!==undefined&&!existing.saleValue.eq(p.sale_value))) throw new Error('Idempotency conflict: external ID already has different data');await tx.ingestionEvent.update({where:{id:event.id},data:{status:'DUPLICATE',processedAt:new Date()}});return {status:'DUPLICATE',transactionId:existing.id,eventId:event.id};}
 const nozzle=await tx.nozzle.findFirst({where:{code:p.nozzle_id,dispenser:{code:p.pump_id,stationId:p.station_id}},include:{product:true}});
 if(!nozzle||nozzle.productId!==p.fuel_type) throw new Error('Unknown station/pump/nozzle or fuel product mismatch');
 const completedAt=new Date(p.completed_at);
 const branchPrice=await tx.stationFuelPrice.findFirst({where:{stationId:p.station_id,productId:p.fuel_type,effectiveAt:{lte:completedAt}},orderBy:{effectiveAt:'desc'}});
 const controllerPrice=await tx.stationFuelPrice.findFirst({where:{stationId:p.station_id,productId:p.fuel_type,origin:'CONTROLLER',effectiveAt:{lte:completedAt}},orderBy:[{effectiveAt:'desc'},{ingestedAt:'desc'}]});
 const effective=p.price_per_litre??controllerPrice?.price.toFixed(2)??branchPrice?.price.toFixed(2)??(await tx.fuelPriceHistory.findFirst({where:{productId:p.fuel_type,effectiveAt:{lte:completedAt}},orderBy:{effectiveAt:'desc'}}))?.price.toFixed(2);
 if(!effective)throw new Error('No effective fuel price is configured for this transaction');
 const calculated=sale(p.litres,effective);
 if(p.sale_value&&!calculated.eq(p.sale_value))throw new Error('Sale value does not equal rounded litres × effective price');
 const record=await tx.fuelTransaction.create({data:{externalId:p.external_transaction_id,nozzleId:nozzle.id,sourceId:source.id,eventId:event.id,litres:D(p.litres),pricePerLitre:D(effective),saleValue:calculated,startedAt:p.started_at?new Date(p.started_at):null,completedAt}});
 if(p.price_per_litre&&(!branchPrice||!branchPrice.price.eq(p.price_per_litre)))await tx.stationFuelPrice.create({data:{externalId:`TXN:${p.external_transaction_id}`,stationId:p.station_id,productId:p.fuel_type,sourceId:source.id,eventId:event.id,price:p.price_per_litre,effectiveAt:completedAt}});
 // Only simulated hardware manufactures meter readings. Real transactions require independent meter snapshots.
 if(p.source!=='external-api') {
 const latest=await tx.meterSnapshot.findFirst({where:{nozzleId:nozzle.id},orderBy:{recordedAt:'desc'}});
 if(!latest) throw new Error('Missing simulator opening meter reading');
 if(latest.recordedAt>completedAt) throw new Error('Out-of-order simulated reading requires explicit correction');
 await tx.meterSnapshot.create({data:{nozzleId:nozzle.id,cumulativeLitres:latest.cumulativeLitres.add(p.litres),recordedAt:completedAt,kind:'CURRENT',origin:p.source}});
 }
 await syncTankAlerts(tx,p.station_id);
 await tx.ingestionSource.update({where:{id:source.id},data:{lastSuccessAt:new Date()}});
 await tx.ingestionEvent.update({where:{id:event.id},data:{status:'ACCEPTED',processedAt:new Date(),error:null}});
 return {status:'ACCEPTED',transactionId:record.id,eventId:event.id};
 });return result;
 }catch(error){const message=error instanceof z.ZodError?error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join(';'):error instanceof Error?error.message:'Ingestion failed';await db.ingestionEvent.update({where:{id:event.id},data:{status:'REJECTED',error:message,processedAt:new Date()}});return {status:'REJECTED',eventId:event.id,error:message};}
}
