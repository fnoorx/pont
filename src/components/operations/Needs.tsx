import { useNavigate, useSearch } from '@tanstack/react-router';
import { Map, ListOrdered, ArrowUpRight, ShieldQuestion, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOperations } from './OperationsProvider';
import { DataNotice, PageHeading } from './OperationsShell';
import { Status } from './Status';
import { LocationMap } from './LocationMap';
import { BlockedBadge, SchoolDetail, TierBadge } from './SchoolDetail';
import { label, type Priority } from '@/lib/live';

const PARTS=[
 {key:'need_points',name:'Need',tone:'bg-primary'},
 {key:'safety_points',name:'Unsafe building',tone:'bg-destructive'},
 {key:'size_points',name:'School size',tone:'bg-info'},
 {key:'verified_points',name:'Verified',tone:'bg-warn'},
] as const;

/** Stacked bar showing exactly which parts make up a school's priority (max 160). */
function PriorityBar({p}:{p:Priority}){
 return <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={PARTS.map(x=>`${x.name} ${p[x.key]}`).join(', ')}>{PARTS.map(x=><span key={x.key} className={x.tone} style={{width:`${p[x.key]/160*100}%`}}/>)}</div>;
}

export function Needs(){const {priority,schools}=useOperations();const search=useSearch({from:'/needs'});const navigate=useNavigate({from:'/needs'});
 const filtered=priority.filter(p=>!search.location||p.region_name===search.location);
 const visibleIds=new Set(filtered.map(p=>p.school_id));
 return <><PageHeading title="Needs & Priorities" subtitle="Who PS43 should help first, and what to fund first. Every score is explained."/><DataNotice kind="live"/><div className="mb-5 flex flex-wrap items-center gap-3"><div className="flex rounded-md border border-border bg-card p-1"><Button variant={search.view!=='map'?'secondary':'ghost'} size="sm" onClick={()=>navigate({search:p=>({...p,view:'list'})})}><ListOrdered/>Ranked list</Button><Button variant={search.view==='map'?'secondary':'ghost'} size="sm" onClick={()=>navigate({search:p=>({...p,view:'map'})})}><Map/>Map</Button></div><select aria-label="Filter needs by region" className="ops-input" value={search.location??''} onChange={e=>navigate({search:p=>({...p,location:e.target.value})})}><option value="">All regions</option>{[...new Set(priority.map(p=>p.region_name))].sort().map(l=><option key={l}>{l}</option>)}</select><span className="ml-auto text-xs text-muted-foreground">{filtered.length} schools</span></div>
 <div className="mb-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldQuestion className="mt-0.5 size-4 shrink-0 text-info"/><span>Priority (out of 160) = need (100 minus readiness) + 20 if the building is unsafe + school size (0 to 30) + 10 if PS43 verified the report. Infrastructure is a chain (safe building, power, devices, internet), so each school also shows what to fund first.</span></div>
 <div className="mb-5 flex flex-wrap gap-4 text-[11px] text-muted-foreground">{PARTS.map(x=><span key={x.key} className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${x.tone}`}/>{x.name}</span>)}</div>
 {search.view==='map'?<div className="ops-panel h-[560px] overflow-hidden"><LocationMap schools={schools.filter(s=>visibleIds.has(s.id))} onSelect={id=>navigate({search:p=>({...p,record:id})})}/></div>:<div className="space-y-3">{filtered.map(p=><article key={p.school_id} className="ops-panel grid gap-4 p-5 sm:grid-cols-[64px_minmax(0,1fr)_auto]"><div className="text-center"><p className="text-[10px] text-muted-foreground">RANK {p.priority_rank}</p><p className={`mt-1 text-3xl font-semibold tabular-nums ${p.priority>=110?'text-destructive':'text-primary'}`}>{p.priority}</p><p className="text-[10px] text-muted-foreground">/ 160</p></div><div className="min-w-0"><h2 className="flex items-center gap-2 text-sm font-semibold">{p.school_name}{p.is_sensitive&&<Lock className="size-3 text-muted-foreground" aria-label="Location withheld"/>}</h2><p className="mt-1.5 text-xs text-muted-foreground">{p.region_name} · {label('enrollment_band',p.enrollment_band)} students · readiness {p.readiness_score}/100</p><div className="mt-3"><PriorityBar p={p}/></div><div className="mt-3 flex flex-wrap items-center gap-2"><TierBadge tier={p.tier}/><BlockedBadge r={p}/><span className="rounded bg-muted px-2 py-1 text-[11px]">Fund first: <strong className="font-semibold">{label('need',p.recommended_need)}</strong></span></div></div><div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end"><Status value={p.verified?'Verified':'Unverified'}/><Button variant="ghost" size="sm" className="mt-2" onClick={()=>navigate({search:s=>({...s,record:p.school_id})})}>Review<ArrowUpRight/></Button></div></article>)}{!filtered.length&&<p className="py-12 text-center text-sm text-muted-foreground">No schools in this region yet.</p>}</div>}
 {search.record&&<SchoolDetail key={search.record} schoolId={search.record} onClose={()=>navigate({search:p=>({...p,record:''})})}/>}</>;
}
