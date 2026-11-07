import { authorised } from '@/lib/auth';
import { ingestDelivery } from '@/lib/delivery-ingestion';
export async function POST(request:Request){if(!await authorised(request,true))return Response.json({error:'Invalid ingestion key'},{status:401});const text=await request.text();if(text.length>65536)return Response.json({error:'Payload too large'},{status:413});let raw:unknown;try{raw=JSON.parse(text);}catch{raw={malformed_json:text};}const result=await ingestDelivery(raw);return Response.json(result,{status:result.status==='REJECTED'?422:200});}
