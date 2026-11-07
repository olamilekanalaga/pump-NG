import { authorised } from '@/lib/auth';
import { analytics } from '@/lib/analytics';
export async function GET(request:Request){if(!await authorised(request))return Response.json({error:'Unauthorised'},{status:401});try{const p=new URL(request.url).searchParams;return Response.json(await analytics(p.get('station')??'ST001',p.get('date')??new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Lagos'})));}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
