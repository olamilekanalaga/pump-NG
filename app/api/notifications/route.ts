import { dailyAlerts } from '@/lib/daily-service';
import { stationController } from '@/lib/controller-auth';
import { authorised } from '@/lib/auth';
import { businessData } from '@/lib/business-data';
import { localToday } from '@/lib/business';
export async function GET(request:Request){if(!await authorised(request))return Response.json({error:'Unauthorised'},{status:401});try{const station=new URL(request.url).searchParams.get('station')??'ST001';if(station!=='ALL')await stationController(request,station);const report=await businessData(station,localToday(),localToday());try{return Response.json({notifications:[...report.notifications,...await dailyAlerts(station)]});}catch{return Response.json({notifications:[...report.notifications,{id:`reconciliation-unavailable:${station}`,kind:'RECONCILIATION',createdAt:new Date().toISOString(),reportDate:localToday(),stationId:station==='ALL'?undefined:station,title:'Daily checks could not complete',message:'Open the daily report to retry. Existing sales and stock alerts remain available.'}]});}}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
