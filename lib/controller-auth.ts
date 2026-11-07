import { authorised } from './auth';
import { db } from './db';
export type ControllerActor={organisationId:string;role:string;userId:string|null;label:string};
export const canManagePrices=(actor:ControllerActor)=>['ADMIN','CONTROLLER'].includes(actor.role);
export async function stationController(request:Request,stationId:string){if(!await authorised(request))throw new Error('Unauthorised');/* Existing login is a shared admin session, not an identified User. Replace this resolver when per-user login is introduced. */const actor:ControllerActor={organisationId:'ORG001',role:'ADMIN',userId:null,label:'Station controller'};if(!canManagePrices(actor))throw new Error('Controller permission required');const station=await db.station.findUniqueOrThrow({where:{id:stationId}});if(station.organisationId!==actor.organisationId)throw new Error('Station access denied');return actor;}
