import { authorised } from '@/lib/auth';
import { businessData } from '@/lib/business-data';
import { localToday,exportBusiness } from '@/lib/business';
export async function GET(request:Request){if(!await authorised(request))return Response.json({error:'Unauthorised'},{status:401});try{const p=new URL(request.url).searchParams;const r=await businessData(p.get('station')??'ST001',p.get('from')??localToday(),p.get('to')??localToday());if(p.get('export'))return new Response(exportBusiness(r,p.get('export')!),{headers:{'Content-Type':'text/csv;charset=utf-8','Content-Disposition':`attachment; filename="fuelstation-${p.get('export')}-${r.from}-${r.to}.csv"`}});return Response.json(r);}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
