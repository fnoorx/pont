import { lazy, Suspense } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { MapPin, LoaderCircle } from 'lucide-react';
import { useOperations } from './OperationsProvider';
import type { Report } from '@/lib/operations';
const SchoolMap=lazy(()=>import('@/components/SchoolMap'));
export function LocationMap({onSelect,reports:subset}:{onSelect:(id:string)=>void;reports?:Report[]}){
 const {reports}=useOperations();const list=subset??reports;
 const schools=list.map(r=>({school_id:r.id,school_name:r.school,region:r.location,lat_display:r.lat,lng_display:r.lng,top_need:r.category}));
 const regions=[...new Set(list.map(r=>r.location))].map(region=>({region,school_count:list.filter(r=>r.location===region).length}));
 const fallback=<div className="flex h-full items-center justify-center gap-2 bg-muted text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/>Loading locations…</div>;
 return <div className="ops-map relative h-full overflow-hidden"><ClientOnly fallback={fallback}><Suspense fallback={fallback}><SchoolMap schools={schools} regions={regions} selectedId={null} onSelect={onSelect}/></Suspense></ClientOnly><div className="pointer-events-none absolute bottom-6 left-3 z-[500] flex items-center gap-3 rounded border border-border bg-card px-3 py-2 text-[10px] shadow-sm"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary"/>Known location</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full border-2 border-warning-ink"/>Region summary</span></div><div className="pointer-events-none absolute right-3 top-3 z-[500] flex items-center gap-1 rounded border border-border bg-card px-2 py-1.5 text-[10px]"><MapPin className="size-3 text-primary"/>Cameroon</div></div>;
}
