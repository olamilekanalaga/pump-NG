import { stationController } from '@/lib/controller-auth';
import { authorised } from '@/lib/auth';
import { businessData } from '@/lib/business-data';
import { localToday } from '@/lib/business';
export async function GET(request:Request){if(!await authorised(request))return Response.json({error:'Unauthorised'},{status:401});try{const station=new URL(request.url).searchParams.get('station')??'ST001';if(station!=='ALL')await stationController(request,station);const report=await businessData(station,localToday(),localToday());return Response.json({notifications:report.notifications});}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
