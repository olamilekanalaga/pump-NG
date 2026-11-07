import { authorised } from '@/lib/auth';
import { ingest } from '@/lib/ingestion';
export async function POST(request:Request){if(!await authorised(request,true))return Response.json({error:'Invalid ingestion API key'},{status:401});const raw=await request.text();if(raw.length>65536)return Response.json({error:'Payload too large'},{status:413});let payload;try{payload=JSON.parse(raw);}catch{payload={malformed_json:raw};}const result=await ingest(payload);return Response.json(result,{status:result.status==='REJECTED'?422:result.status==='QUEUED'?202:200});}
