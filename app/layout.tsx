import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'PumpNG — Owner Intelligence',description:'Fuel retail ingestion and operational intelligence'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{var t=localStorage.getItem('pumpng-theme')==='dark'?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}"}}/></head><body>{children}</body></html>;}
