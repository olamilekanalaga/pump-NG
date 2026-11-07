import { authorised } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
const id=z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('station'),id,name:z.string().min(2).max(120),location:z.string().min(2).max(120)}),
 z.object({action:z.literal('pump'),stationId:id,code:id}),z.object({action:z.literal('nozzle'),stationId:id,pump:id,code:id,product:id}),
 z.object({action:z.literal('product'),id,name:z.string().min(1).max(100)}),
 z.object({action:z.literal('price'),product:id,price:z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v=>Number(v)>0),effectiveAt:z.iso.datetime()}),
 z.object({action:z.literal('mode'),stationId:id,mode:z.enum(['SIMULATION','EXTERNAL'])}),
 z.object({action:z.literal('snapshot'),nozzleId:z.string(),value:z.string().regex(/^\d+(\.\d{1,3})?$/),recordedAt:z.iso.datetime(),kind:z.enum(['OPENING','CLOSING','BOUNDARY','CURRENT','RESET','REPLACEMENT','CORRECTION']),exception:z.string().max(300).optional()})]);
export async function POST(request:Request){if(!await authorised(request))return Response.json({error:'Unauthorised'},{status:401});try{const p=schema.parse(await request.json());let result;
 if(p.action==='station')result=await db.$transaction(async tx=>{const station=await tx.station.create({data:{id:p.id,name:p.name,location:p.location,organisationId:'ORG001'}});for(const name of ['simulator','external-api','mock-forecourt'])await tx.ingestionSource.create({data:{stationId:p.id,name,mode:name==='external-api'?'EXTERNAL':'SIMULATION'}});return station;});
 if(p.action==='pump')result=await db.dispenser.create({data:{stationId:p.stationId,code:p.code}});
 if(p.action==='nozzle'){const pump=await db.dispenser.findUniqueOrThrow({where:{stationId_code:{stationId:p.stationId,code:p.pump}}});result=await db.nozzle.create({data:{dispenserId:pump.id,code:p.code,productId:p.product}});}
 if(p.action==='product')result=await db.fuelProduct.create({data:{id:p.id,name:p.name}});
 if(p.action==='price')result=await db.fuelPriceHistory.create({data:{productId:p.product,price:p.price,effectiveAt:new Date(p.effectiveAt)}});
 if(p.action==='mode')result=await db.integrationConfiguration.upsert({where:{stationId_adapter:{stationId:p.stationId,adapter:'simulator'}},create:{stationId:p.stationId,adapter:'simulator',mode:p.mode},update:{mode:p.mode}});
 if(p.action==='snapshot'){if(['RESET','REPLACEMENT','CORRECTION'].includes(p.kind)&&!p.exception)throw new Error('Exception reason is required');result=await db.meterSnapshot.create({data:{nozzleId:p.nozzleId,cumulativeLitres:p.value,recordedAt:new Date(p.recordedAt),kind:p.kind,origin:'manual',exception:p.exception}});}
 return Response.json({ok:true,result});}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
