import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';
export function equal(a: string,b: string) {const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);}
function signature(expires:string){if(!process.env.SESSION_SECRET||!process.env.ADMIN_PASSWORD)throw new Error('Admin authentication is not configured');return createHmac('sha256',process.env.SESSION_SECRET).update(`${expires}:${process.env.ADMIN_PASSWORD}`).digest('hex');}
export function sessionToken() {const expires=String(Date.now()+28800000);return `${expires}.${signature(expires)}`;}
export async function admin() {try {const token=(await cookies()).get('fsi_session')?.value??'';const [expires,signed]=token.split('.');return !!expires&&Number(expires)>Date.now()&&equal(signed??'',signature(expires));}catch{return false;}}
export async function authorised(request: Request, ingestion=false) {
 if(ingestion){const key=process.env.INGESTION_API_KEY;return !!key&&equal(request.headers.get('authorization')??'',`Bearer ${key}`);}
 if(!['GET','HEAD'].includes(request.method)){const origin=request.headers.get('origin');const host=request.headers.get('x-forwarded-host')??request.headers.get('host')??new URL(request.url).host;if(request.headers.get('sec-fetch-site')==='cross-site')return false;if(origin){try{if(new URL(origin).host!==host)return false;}catch{return false;}}}
 return admin();
}
