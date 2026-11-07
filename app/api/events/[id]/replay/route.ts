import { authorised } from '@/lib/auth';
import { db } from '@/lib/db';
import { ingest } from '@/lib/ingestion';
import { ingestMeter } from '@/lib/meters';
import { ingestTankStock } from '@/lib/tank-ingestion';
import { ingestDelivery } from '@/lib/delivery-ingestion';
import { ingestPrice } from '@/lib/price-ingestion';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){if(!await authorised(request))return Response.json({error:'Unauthorised'},{status:401});const {id}=await params;const event=await db.ingestionEvent.findUnique({where:{id}});if(!event)return Response.json({error:'Not found'},{status:404});const isMeter=event.raw&&typeof event.raw==='object'&&'external_snapshot_id' in event.raw;const isStock=event.raw&&typeof event.raw==='object'&&'external_event_id' in event.raw;const isDelivery=event.raw&&typeof event.raw==='object'&&'external_delivery_id' in event.raw;const isPrice=event.raw&&typeof event.raw==='object'&&'external_price_id' in event.raw;const result=isDelivery?await ingestDelivery(event.raw,id):isPrice?await ingestPrice(event.raw,id):isStock?await ingestTankStock(event.raw,id):isMeter?await ingestMeter(event.raw):await ingest(event.raw,id);if(isMeter)await db.ingestionEvent.update({where:{id:result.eventId},data:{replayOf:id}});if(result.status==='ACCEPTED'||result.status==='DUPLICATE')await db.ingestionEvent.update({where:{id},data:{status:'REPLAYED',error:null,attempts:{increment:1}}});return Response.json(result);}
