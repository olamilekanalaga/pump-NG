import { randomUUID } from 'node:crypto';
import { ingest, type TransactionPayload } from './ingestion';
export interface DispenserAdapter { readonly name:string; submit(payload:unknown):ReturnType<typeof ingest>; }
export class ExternalApiAdapter implements DispenserAdapter {readonly name='external-api';submit(payload:unknown){return ingest(payload);}}
export class SimulatedDispenserAdapter implements DispenserAdapter {
 readonly name:string='simulator';
 submit(payload:unknown){return ingest(payload);}
 generate(input:Omit<TransactionPayload,'external_transaction_id'|'completed_at'|'source'>){return this.submit({...input,external_transaction_id:`SIM-${randomUUID()}`,completed_at:new Date().toISOString(),source:this.name});}
}
export class MockForecourtAdapter extends SimulatedDispenserAdapter {override readonly name='mock-forecourt';}
