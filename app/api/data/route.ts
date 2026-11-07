import { stationController } from '@/lib/controller-auth';
import { authorised } from '@/lib/auth';
import { analytics } from '@/lib/analytics';
export async function GET(request:Request){if(!await authorised(request))return Response.json({error:'Unauthorised'},{status:401});try{const p=new URL(request.url).searchParams;const station=p.get('station')??'ST001';await stationController(request,station);return Response.json(await analytics(station,p.get('date')??new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Lagos'})));}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
