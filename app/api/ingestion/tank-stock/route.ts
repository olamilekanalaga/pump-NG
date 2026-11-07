import { authorised } from '@/lib/auth';
import { ingestTankStock } from '@/lib/tank-ingestion';
export async function POST(request:Request){if(!await authorised(request,true))return Response.json({error:'Invalid ingestion key'},{status:401});const raw=await request.text();if(raw.length>65536)return Response.json({error:'Payload too large'},{status:413});let payload:unknown;try{payload=JSON.parse(raw);}catch{payload={malformed_json:raw};}const result=await ingestTankStock(payload);return Response.json(result,{status:result.status==='REJECTED'?422:200});}
