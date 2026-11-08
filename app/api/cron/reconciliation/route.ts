import { equal } from '@/lib/auth';
import { dailyScope } from '@/lib/daily-service';
import { dayBefore } from '@/lib/daily-reconciliation';
import { localToday } from '@/lib/business';
export const maxDuration=300;
export async function GET(request:Request){const secret=process.env.CRON_SECRET;if(!secret)return Response.json({error:'Daily scheduling is not configured'},{status:503});if(!equal(request.headers.get('authorization')??'',`Bearer ${secret}`))return Response.json({error:'Unauthorised'},{status:401});try{let reports=0;for(let n=1;n<=7;n++)reports+=(await dailyScope('ALL',dayBefore(localToday(),n))).length;return Response.json({ok:true,reports});}catch{return Response.json({error:'Daily reconciliation failed; retry to resume'},{status:500});}}
