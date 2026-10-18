import { lazy, Suspense } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { MapPin, LoaderCircle } from 'lucide-react';
import { useOperations } from './OperationsProvider';
import { label, type School } from '@/lib/live';
import type { Row } from '@/lib/ps43';
const SchoolMap=lazy(()=>import('@/components/SchoolMap'));

/** Live school map. Sensitive schools have no coordinates and appear only in their region marker. */
export function LocationMap({onSelect,schools:subset}:{onSelect:(id:string)=>void;schools?:School[]}){
 const {schools,regions}=useOperations();const list=subset??schools;
 const rows=list.map(s=>({...s,top_need:label('need',s.top_need)}));
 const fallback=<div className="flex h-full items-center justify-center gap-2 bg-muted text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/>Loading locations…</div>;
 return <div className="ops-map relative h-full overflow-hidden"><ClientOnly fallback={fallback}><Suspense fallback={fallback}><SchoolMap schools={rows} regions={regions as unknown as Row[]} selectedId={null} onSelect={onSelect}/></Suspense></ClientOnly><div className="pointer-events-none absolute bottom-6 left-3 z-[500] flex items-center gap-3 rounded border border-border bg-card px-3 py-2 text-[10px] shadow-sm"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary"/>School (approximate, about 11 km)</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full border-2 border-warning-ink"/>Region total</span></div><div className="pointer-events-none absolute right-3 top-3 z-[500] flex items-center gap-1 rounded border border-border bg-card px-2 py-1.5 text-[10px]"><MapPin className="size-3 text-primary"/>Cameroon</div></div>;
}
