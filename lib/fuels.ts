const codes:Record<string,string>={PETROLEUM:'PMS',PETROL:'PMS',PMS:'PMS',KEROSENE:'DPK',DPK:'DPK',DIESEL:'AGO',AGO:'AGO'};
export function fuelCode(value:string){return codes[value.trim().toUpperCase()]??value.trim();}
export function fuelName(value:string){return ({PMS:'Petroleum',DPK:'Kerosene',AGO:'Diesel'} as Record<string,string>)[fuelCode(value)]??value;}
