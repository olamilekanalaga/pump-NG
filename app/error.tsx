'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="content"><h1>Unable to load this workspace</h1><p>Check your connection and try again.</p><Button onClick={reset}>Try again</Button></main>;}
