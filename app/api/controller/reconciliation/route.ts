import { authorised } from '@/lib/auth';
import { stationController } from '@/lib/controller-auth';
import { dailyScope,dailyService } from '@/lib/daily-service';
import { dailyActionSchema } from '@/lib/daily-reconciliation';
import { localToday } from '@/lib/business';
export const maxDuration=300;
export async function GET(request:Request){if(!await authorised(request))return Response.json({error:'Unauthorised'},{status:401});try{const p=new URL(request.url).searchParams,scope=p.get('station')??'ST001';const actor=scope==='ALL'?undefined:await stationController(request,scope);return Response.json({reports:await dailyScope(scope,p.get('date')??localToday(),actor)});}catch(e){return Response.json({error:(e as Error).message},{status:/access|permission/.test((e as Error).message)?403:400});}}
export async function POST(request:Request){try{const p=dailyActionSchema.parse(await request.json()),actor=await stationController(request,p.stationId);return Response.json(await dailyService(p.stationId,p.date,p,actor));}catch(e){return Response.json({error:(e as Error).message},{status:/Unauthorised|access|permission/.test((e as Error).message)?403:400});}}
