import { useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowUpRight, CalendarDays, FolderKanban, RotateCcw, Handshake, CheckCircle2, Circle, Camera, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOperations } from './OperationsProvider';
import { DataNotice, PageHeading } from './OperationsShell';
import { Status } from './Status';
import { Drawer, Photos, TierBadge } from './SchoolDetail';
import { fmtDate, label, type Project, type ProjectStatus } from '@/lib/live';

const COLUMNS:ProjectStatus[]=['planned','in_progress','completed'];
const dot:Record<ProjectStatus,string>={planned:'bg-muted-foreground/40',in_progress:'bg-warn',completed:'bg-primary'};

export function Projects(){const {projects}=useOperations();const search=useSearch({from:'/projects'});const navigate=useNavigate({from:'/projects'});const selected=projects.find(p=>p.id===search.record);
 const filtered=projects.filter(p=>(!search.location||p.region_name===search.location)&&(!search.filter||p.status===search.filter));
 return <><PageHeading title="Projects & Deployment" subtitle="Which partner is delivering what, where, and how far along each delivery is."/><DataNotice kind="demo"/><div className="mb-5 flex flex-wrap items-center gap-3"><FolderKanban className="size-4 text-primary"/><span className="text-xs font-semibold">Deployment board</span><select aria-label="Filter projects by status" className="ops-input" value={search.filter??''} onChange={e=>navigate({search:p=>({...p,filter:e.target.value})})}><option value="">All projects</option>{COLUMNS.map(s=><option key={s} value={s}>{label('project_status',s)}</option>)}</select><select aria-label="Filter projects by region" className="ops-input" value={search.location??''} onChange={e=>navigate({search:p=>({...p,location:e.target.value})})}><option value="">All regions</option>{[...new Set(projects.map(p=>p.region_name))].sort().map(l=><option key={l}>{l}</option>)}</select><Button size="icon" variant="ghost" aria-label="Reset project filters" onClick={()=>navigate({search:{}})}><RotateCcw/></Button><span className="ml-auto text-xs text-muted-foreground">{filtered.length} projects</span></div>
 <div className="overflow-x-auto pb-4"><div className="grid min-w-[900px] grid-cols-3 gap-4">{COLUMNS.map(status=><section key={status} className="min-w-0"><div className="mb-4 flex items-center gap-2 border-b border-border pb-3"><span className={`size-2 rounded-full ${dot[status]}`}/><h2 className="text-xs font-semibold">{label('project_status',status)}</h2><span className="ml-auto text-xs text-muted-foreground">{filtered.filter(p=>p.status===status).length}</span></div><div className="space-y-3">{filtered.filter(p=>p.status===status).map(p=><ProjectCard key={p.id} p={p} open={()=>navigate({search:s=>({...s,record:p.id})})}/>)}{!filtered.some(p=>p.status===status)&&<div className="border border-dashed border-border py-8 text-center text-[11px] text-muted-foreground">No projects</div>}</div></section>)}</div></div>
 {selected&&<ProjectDetail key={selected.id} project={selected} onClose={()=>navigate({search:s=>({...s,record:''})})}/>}</>;
}

function ProjectCard({p,open}:{p:Project;open:()=>void}){
 const pct=p.milestones_total?Math.round(p.milestones_done/p.milestones_total*100):0;
 return <article className="ops-panel p-4"><div className="flex items-center justify-between"><TierBadge tier={p.tier}/><Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`Open ${p.title}`} onClick={open}><ArrowUpRight/></Button></div><h3 className="mt-3 text-[13px] font-semibold leading-5"><Button variant="link" className="h-auto whitespace-normal p-0 text-left text-[13px] text-foreground" onClick={open}>{p.title}</Button></h3><p className="mt-1.5 text-[11px] text-muted-foreground">{p.school_name} · {p.region_name}</p><p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Handshake className="size-3"/>{p.partner_name??'Partner not assigned'}</p><div className="mt-4 border-t border-border pt-3"><div className="mb-1.5 flex justify-between text-[10px] text-muted-foreground"><span>MILESTONES</span><span>{p.milestones_done} / {p.milestones_total}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${pct}%`}}/></div></div><div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>{label('need',p.intervention)}</span>{p.budget_usd!=null&&<span>${p.budget_usd.toLocaleString()}</span>}</div></article>;
}

function ProjectDetail({project:p,onClose}:{project:Project;onClose:()=>void}){
 const {milestones}=useOperations();
 const steps=milestones.filter(m=>m.project_id===p.id);
 const photos=steps.map(m=>m.photo_path).filter((x):x is string=>Boolean(x));
 return <Drawer title={p.title} kicker={`PROJECT · ${label('project_status',p.status).toUpperCase()}`} onClose={onClose}>
  <p className="mt-2 text-xs text-muted-foreground">{p.school_name} · {p.region_name}</p>
  <div className="mt-3 flex flex-wrap gap-2"><Status value={label('project_status',p.status)}/><TierBadge tier={p.tier}/></div>
  <dl className="mt-5 grid grid-cols-[130px_minmax(0,1fr)] gap-y-2.5 text-xs">{([['Partner',p.partner_name??'Not assigned'],['Intervention',label('need',p.intervention)],['Budget',p.budget_usd!=null?`$${p.budget_usd.toLocaleString()}`:'Not set'],['Started',fmtDate(p.started_at)||'Not started'],['Completed',fmtDate(p.completed_at)||'Not yet']] as [string,string][]).map(([k,v])=><div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
  <h3 className="mb-3 mt-6 text-sm font-semibold">Milestones</h3>
  <ol className="space-y-2">{steps.map(m=><li key={m.id} className="flex gap-3 rounded-md border border-border p-3 text-xs">{m.status==='done'?<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary"/>:<Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground"/>}<div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="font-medium">{m.title}</span><Status value={label('milestone_status',m.status)}/></div><p className="mt-1 flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="size-3"/>{m.status==='done'?`Done ${fmtDate(m.completed_at)}`:`Due ${fmtDate(m.due_date)}`}</p>{(m.photo_path||m.verified)&&<p className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">{m.photo_path&&<span className="flex items-center gap-1"><Camera className="size-3"/>Photo evidence</span>}{m.verified&&<span className="flex items-center gap-1 text-primary"><ShieldCheck className="size-3"/>Checked by PS43</span>}</p>}</div></li>)}</ol>
  <h3 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold"><Camera className="size-4 text-primary"/>Proof photos</h3>
  <Photos paths={photos}/>
  <p className="mt-6 text-[10px] text-muted-foreground">Demo data: fictional project to show how delivery is tracked.</p>
 </Drawer>;
}
