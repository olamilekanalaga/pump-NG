import { stationController } from '@/lib/controller-auth';
import { authorised } from '@/lib/auth';
import { analytics } from '@/lib/analytics';
import { csv } from '@/lib/domain';
export async function GET(request:Request){if(!await authorised(request))return Response.json({error:'Unauthorised'},{status:401});try{const p=new URL(request.url).searchParams;const station=p.get('station')??'ST001';await stationController(request,station);const data=await analytics(station,p.get('date')??new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Lagos'}));const type=p.get('type')??'transactions';const rows=type==='reconciliation'?data.monitoring:type==='daily'?data.daily:data.transactions;return new Response(csv(rows),{headers:{'Content-Type':'text/csv;charset=utf-8','Content-Disposition':`attachment; filename="fuelstation-${type}-${data.date}.csv"`}});}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
