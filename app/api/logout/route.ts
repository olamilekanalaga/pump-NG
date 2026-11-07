import { cookies } from 'next/headers';
export async function POST(){(await cookies()).delete('fsi_session');return Response.json({ok:true});}
