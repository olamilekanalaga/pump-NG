import { Prisma } from '@prisma/client';
export const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
export const sale = (litres: string, price: string) => D(litres).mul(price).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
export function meterDelta(opening?: string, closing?: string, exception?: string | null) {
 if (exception) throw new Error(exception);
 if (opening === undefined || closing === undefined) throw new Error('Missing boundary meter snapshot');
 const delta = D(closing).sub(opening);
 if (delta.isNegative()) throw new Error('Meter reset or replacement requires review');
 return delta;
}
export function csv(rows: Record<string, unknown>[]) {
 if (!rows.length) return '';
 const keys=Object.keys(rows[0]);
 const cell=(v: unknown)=>'"'+String(v ?? '').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"';
 return [keys.map(cell).join(','),...rows.map(row=>keys.map(k=>cell(row[k])).join(','))].join('\r\n');
}
export function dayRange(date: string) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) throw new Error('Invalid date');
 const start=new Date(date+'T00:00:00+01:00');
 return {start,end:new Date(start.getTime()+86400000)};
}
