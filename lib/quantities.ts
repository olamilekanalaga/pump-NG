export function scaled(value:string,places=3):bigint{if(!new RegExp(`^\\d+(\\.\\d{1,${places}})?$`).test(value))throw new Error('Invalid decimal value');const [a,b='']=value.split('.');return BigInt(a)*10n**BigInt(places)+BigInt(b.padEnd(places,'0'));}
export function decimal(value:bigint,places=3):string{const negative=value<0n;const v=(negative?-value:value).toString().padStart(places+1,'0');return `${negative?'-':''}${v.slice(0,-places)}.${v.slice(-places)}`;}
export function valueFromLitres(litres:string,price:string){return decimal((scaled(litres)*scaled(price,2)+500n)/1000n,2);}
