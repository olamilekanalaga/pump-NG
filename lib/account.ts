import { z } from 'zod';
export const preferencesSchema=z.object({theme:z.enum(['light','dark']).default('light'),motion:z.boolean(),compactReports:z.boolean(),stockAlerts:z.boolean(),salesSummary:z.boolean(),salesGrowth:z.boolean()});
export type Preferences=z.infer<typeof preferencesSchema>;
export const defaultPreferences:Preferences={theme:'light',motion:true,compactReports:false,stockAlerts:true,salesSummary:true,salesGrowth:true};
export type WorkspaceAccount={displayName:string;contactEmail:string;phone:string;organisation:string;role:string;preferences:Preferences};
export const accountUpdateSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('profile'),displayName:z.string().trim().min(2).max(80),contactEmail:z.union([z.literal(''),z.email().max(160)]).transform(v=>v.trim()),phone:z.string().trim().max(30).regex(/^[+\d ()-]*$/)}),
 z.object({action:z.literal('preferences'),preferences:preferencesSchema})]);
export type AccountUpdate=z.infer<typeof accountUpdateSchema>;
export function accountPreferences(value:unknown):Preferences{const parsed=preferencesSchema.safeParse(value);return parsed.success?parsed.data:{...defaultPreferences};}
