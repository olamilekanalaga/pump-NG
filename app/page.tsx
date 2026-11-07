import Console from '@/components/console';
export default function Page(){return <Console publicDemo={!process.env.DATABASE_URL}/>;}
