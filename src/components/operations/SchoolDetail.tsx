import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { X, ShieldAlert, Check, Handshake, Lock, Camera, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOperations } from './OperationsProvider';
import { Status } from './Status';
import { blockedBadge, fmtDate, label, signedUrls, TIER_ADVICE, type Readiness } from '@/lib/live';

/** Right-hand drawer used for school, report and project details. */
export function Drawer({title,kicker,onClose,children}:{title:string;kicker:string;onClose:()=>void;children:ReactNode}){
 return <div className="fixed inset-0 z-[1200] bg-foreground/25" onClick={onClose}><aside role="dialog" aria-modal="true" aria-label={title} className="absolute inset-y-0 right-0 w-full max-w-[560px] overflow-y-auto bg-card p-6 shadow-lg" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{kicker}</span><Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><X/></Button></div><h2 className="mt-4 text-2xl font-semibold leading-tight">{title}</h2>{children}</aside></div>;
}

/** Labelled horizontal bar for a points value out of a maximum. */
export function PointsBar({name,value,max,tone='bg-primary'}:{name:string;value:number;max:number;tone?:string}){
 return <div><div className="mb-1 flex justify-between text-[11px]"><span className="text-muted-foreground">{name}</span><span className="font-semibold tabular-nums">{value}<span className="font-normal text-muted-foreground"> / {max}</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${tone}`} style={{width:`${Math.min(100,Math.round(value/max*100))}%`}}/></div></div>;
}

export function TierBadge({tier}:{tier:string}){
 const tone=tier==='tier0'?'bg-destructive/8 text-destructive':tier==='tier1'?'bg-warn/15 text-warning-ink':'bg-primary/8 text-primary';
 return <span className={`inline-flex items-center rounded px-2 py-1 text-[11px] font-semibold ${tone}`}>{label('tier',tier)}</span>;
}

export function BlockedBadge({r}:{r:Pick<Readiness,'stated_need'|'blocked_by'>}){
 const text=blockedBadge(r);
 return text?<span className="inline-flex items-center gap-1.5 rounded bg-warn/15 px-2 py-1 text-[11px] font-medium text-warning-ink"><ShieldAlert className="size-3 shrink-0"/>{text}</span>:null;
}

/** Photos from the private field-media bucket, via short-lived signed URLs. */
export function Photos({paths}:{paths:string[]}){
 const q=useQuery({queryKey:['signed',...paths],queryFn:()=>signedUrls(paths),enabled:paths.length>0,staleTime:30*60*1000});
 if(!paths.length)return <p className="text-xs text-muted-foreground">No photos.</p>;
 if(q.error)return <p className="text-xs text-destructive">{(q.error as Error).message}</p>;
 return <div className="grid grid-cols-2 gap-2">{paths.map(p=>q.data?.[p]?<a key={p} href={q.data[p]} target="_blank" rel="noreferrer"><img src={q.data[p]} alt="Photo of the school building" className="aspect-[4/3] w-full rounded-md border border-border object-cover" loading="lazy"/></a>:<div key={p} className="aspect-[4/3] animate-pulse rounded-md bg-muted"/>)}</div>;
}

export function ReadinessCard({r}:{r:Readiness}){
 return <section className="mt-6 rounded-lg border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Readiness</h3><TierBadge tier={r.tier}/></div><div className="mt-3 flex items-end gap-3"><p className="text-4xl font-semibold tabular-nums leading-none">{r.score}</p><p className="pb-1 text-xs text-muted-foreground">/ 100</p></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{TIER_ADVICE[r.tier]}</p>{r.safety_first&&<p className="mt-2 text-[11px] text-destructive">Unsafe building: Tier 0 until the building is safe.</p>}{r.tier_capped&&<p className="mt-2 text-[11px] text-warning-ink">Capped at Tier 1: no computer lab without reliable power.</p>}<div className="mt-4 grid gap-3 sm:grid-cols-2"><PointsBar name="Building" value={r.building_points} max={30}/><PointsBar name="Power" value={r.power_points} max={30}/><PointsBar name="Signal" value={r.connectivity_points} max={20}/><PointsBar name="Devices" value={r.devices_points} max={20}/></div><div className="mt-4 border-t border-border pt-3"><p className="text-[10px] font-semibold text-muted-foreground">ASKED FOR</p><p className="mt-1 text-sm">{label('need',r.stated_need)}</p>{r.blocked_by&&<div className="mt-2"><BlockedBadge r={r}/></div>}<p className="mt-3 text-[10px] font-semibold text-muted-foreground">FUND, IN ORDER</p><div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">{r.package.map((n,i)=><span key={n} className="flex items-center gap-1.5">{i>0&&<ArrowRight className="size-3 text-muted-foreground"/>}<span className={`rounded px-2 py-1 ${i===0?'bg-primary text-primary-foreground':'bg-muted'}`}>{label('need',n)}</span></span>)}</div></div></section>;
}

export function SchoolDetail({schoolId,onClose}:{schoolId:string;onClose:()=>void}){
 const {schools,readiness,matches,assessments,media,verify}=useOperations();
 const [pending,setPending]=useState('');const [err,setErr]=useState('');
 const s=schools.find(x=>x.id===schoolId);
 if(!s)return <Drawer title="School not found" kicker="SCHOOL" onClose={onClose}><p className="mt-4 text-sm text-muted-foreground">It may have been removed by a data reset.</p></Drawer>;
 const r=readiness.find(x=>x.school_id===schoolId);
 const m=matches.filter(x=>x.school_id===schoolId);
 const history=assessments.filter(a=>a.school_id===schoolId);
 const photos=media.filter(x=>x.school_id===schoolId&&x.type==='photo').map(x=>x.storage_path);
 async function toggle(id:string,next:boolean){setPending(id);setErr('');try{await verify(id,next);}catch(e){setErr(e instanceof Error?e.message:'Could not update.');}finally{setPending('');}}
 return <Drawer title={s.name} kicker={`SCHOOL · ${s.region_name.toUpperCase()}`} onClose={onClose}>
  <p className="mt-2 text-xs text-muted-foreground">{[s.town,s.region_name,label('enrollment_band',s.enrollment_band)+' students'].filter(Boolean).join(' · ')}</p>
  {s.is_sensitive&&<p className="mt-3 flex items-center gap-1.5 rounded bg-muted px-2 py-1.5 text-[11px] text-muted-foreground"><Lock className="size-3"/>Conflict-affected region: exact location withheld, shown only as a region total.</p>}
  {r&&<ReadinessCard r={r}/>}
  <section className="mt-6"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Handshake className="size-4 text-primary"/>Matched partners</h3>{m.length?<ul className="space-y-2">{m.map(p=><li key={p.partner_id} className="rounded-md border border-border p-3 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{p.partner_name}</span><Status value={label('trust',p.trust_level)}/></div><p className="mt-1.5 text-muted-foreground">{label('partner_type',p.partner_type)} · {p.same_region?'Same region':'Nationwide'} · {p.projects_completed} project{p.projects_completed===1?'':'s'} delivered</p><div className="mt-2 flex flex-wrap gap-1.5">{p.covers.map(c=><span key={c} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{label('need',c)}</span>)}{p.covers_full_package&&<span className="flex items-center gap-1 rounded bg-primary/8 px-1.5 py-0.5 text-[10px] font-semibold text-primary"><Check className="size-3"/>Covers everything</span>}</div></li>)}</ul>:<p className="text-xs text-muted-foreground">No partner offers this need yet.</p>}<Link to="/partners" className="mt-2 inline-block text-[11px] text-primary">All partners</Link></section>
  <section className="mt-6"><h3 className="mb-3 text-sm font-semibold">Field reports ({history.length})</h3>{err&&<p role="alert" className="mb-2 text-xs text-destructive">{err}</p>}<ul className="space-y-2">{history.map(a=><li key={a.id} className="rounded-md border border-border p-3 text-xs"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{a.ref_code} · {fmtDate(a.submitted_at)}</span><label className="flex cursor-pointer items-center gap-2"><span className={a.verified?'text-primary':'text-muted-foreground'}>{a.verified?'Verified':'Unverified'}</span><input type="checkbox" checked={a.verified} disabled={pending===a.id} onChange={()=>toggle(a.id,!a.verified)} className="size-4 accent-[var(--primary)]"/></label></div><p className="mt-1.5 text-muted-foreground">{label('building_condition',a.building_condition)} · {label('power_source',a.power_source)} · {label('connectivity',a.connectivity)} · {label('devices',a.devices)}</p><p className="mt-1 text-muted-foreground">Needs {label('need',a.top_need).toLowerCase()} · {label('role',a.reporter_role)} via {label('channel',a.reporter_channel)}</p>{a.notes&&<p className="mt-2 rounded bg-muted/60 p-2 leading-5">“{a.notes}”</p>}</li>)}</ul></section>
  <section className="mt-6"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Camera className="size-4 text-primary"/>Photos</h3><Photos paths={photos}/></section>
 </Drawer>;
}
