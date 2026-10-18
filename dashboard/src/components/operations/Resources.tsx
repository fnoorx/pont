import { useState } from 'react';
import { Boxes, Calculator, CircleCheck, GraduationCap, MapPin, TriangleAlert, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOperations } from './OperationsProvider';
import { DataNotice, PageHeading } from './OperationsShell';
import { label, unlockLine, usd, type ResourceKind } from '@/lib/live';

const KIND_ICON={equipment:Boxes,funding:Wallet,expertise:GraduationCap} as const;
const KIND_ORDER={equipment:0,funding:1,expertise:2} as const;

/** What PS43 can deploy, which schools can use it now, and what has to be funded first for the rest. */
export function Resources(){
 const {resources,packages}=useOperations();
 const [kind,setKind]=useState<''|ResourceKind>('');const [all,setAll]=useState(false);
 const funding=resources.filter(r=>r.kind==='funding').reduce((s,r)=>s+(r.value_usd??0),0);
 const firstSteps=packages.reduce((s,p)=>s+(p.first_step_cost_usd??0),0);
 const fullPackages=packages.reduce((s,p)=>s+p.package_cost_usd,0);
 const waiting=resources.filter(r=>r.schools_blocked>0).length;
 const list=resources.filter(r=>!kind||r.kind===kind).sort((a,b)=>KIND_ORDER[a.kind]-KIND_ORDER[b.kind]||b.schools_blocked-a.schools_blocked||a.name.localeCompare(b.name));
 const rows=all?packages:packages.slice(0,10);
 const kpis=[
  {label:'Funding available',value:usd(funding),detail:`${resources.filter(r=>r.kind==='funding').length} funds, some earmarked for one need`,icon:Wallet},
  {label:'Cost of every first step',value:usd(firstSteps),detail:`Estimate · the first thing to fund at ${packages.length} schools`,icon:Calculator},
  {label:'Cost of every full package',value:usd(fullPackages),detail:"Estimate · meets each school's stated need",icon:Calculator},
  {label:'Resources waiting on a first step',value:String(waiting),detail:'Some schools need a cheaper fix before they can use them',icon:TriangleAlert},
 ];
 return <><PageHeading step={{n:3,name:"Match"}} title="Resources" subtitle="What can PS43 give, which schools can use it now, and what has to be funded first for the rest?"/><DataNotice kind="demo"/>
 <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(k=><div key={k.label} className="ops-panel p-5"><k.icon className="mb-4 size-5 text-primary"/><p className="text-3xl font-semibold tabular-nums">{k.value}</p><p className="mt-2 text-xs font-semibold">{k.label}</p><p className="mt-1 text-[10px] text-muted-foreground">{k.detail}</p></div>)}</div>
 <div className="mb-5 mt-6 flex flex-wrap items-center gap-3"><select aria-label="Filter resources by kind" className="ops-input" value={kind} onChange={e=>setKind(e.target.value as ''|ResourceKind)}><option value="">All resources</option><option value="equipment">Equipment</option><option value="funding">Funding</option><option value="expertise">Expertise</option></select><span className="ml-auto text-xs text-muted-foreground">{list.length} resources</span></div>
 <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map(r=>{const Icon=KIND_ICON[r.kind];const unlock=unlockLine(r);const amount=[r.quantity!=null?`${r.quantity} ${r.unit??''}`.trim():null,r.value_usd!=null?(r.kind==='funding'?usd(r.value_usd):`worth ${usd(r.value_usd)}`):null].filter(Boolean).join(' · ');return <article key={r.id} className="ops-panel p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-sm font-semibold leading-5">{r.name}</h2><p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><MapPin className="size-3 shrink-0"/>{r.location??'Location to confirm'} · {r.provider}</p></div><span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-muted px-2 py-1 text-[11px] font-medium"><Icon className="size-3"/>{label('resource_kind',r.kind)}</span></div><p className="mt-3 text-lg font-semibold tabular-nums">{amount||'Available'}</p><p className="text-[11px] text-muted-foreground">For {r.need?label('need',r.need).toLowerCase():'any need'}</p><div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">{!r.need?<p className="flex items-start gap-1.5"><CircleCheck className="mt-0.5 size-3.5 shrink-0 text-primary"/>Can pay for any school's first step</p>:r.schools_wanting===0?<p className="text-muted-foreground">No school has asked for this yet</p>:<><p className="flex items-start gap-1.5"><CircleCheck className="mt-0.5 size-3.5 shrink-0 text-primary"/>{r.schools_ready} school{r.schools_ready===1?'':'s'} can use it now</p>{unlock&&<p className="flex items-start gap-1.5 text-warning-ink"><TriangleAlert className="mt-0.5 size-3.5 shrink-0"/>{unlock}</p>}</>}</div></article>;})}</div>
 {!list.length&&<p className="py-12 text-center text-sm text-muted-foreground">No resources of this kind.</p>}
 <section className="mt-8"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Cost per school, in priority order</h2>{packages.length>10&&<Button variant="ghost" size="sm" onClick={()=>setAll(!all)}>{all?'Show top 10':`Show all ${packages.length}`}</Button>}</div>
  <div className="ops-panel overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="border-b border-border text-[10px] text-muted-foreground"><tr><th className="p-3 font-medium">#</th><th className="p-3 font-medium">School</th><th className="p-3 font-medium">Tier</th><th className="p-3 font-medium">Fund first</th><th className="p-3 font-medium">Full package</th></tr></thead><tbody>{rows.map(p=><tr key={p.school_id} className="border-b border-border last:border-0"><td className="p-3 tabular-nums text-muted-foreground">{p.priority_rank??''}</td><td className="p-3"><p className="font-semibold">{p.school_name}</p><p className="text-[10px] text-muted-foreground">{p.region_name}</p></td><td className="p-3">{label('tier',p.tier)}</td><td className="p-3"><p>{label('need',p.recommended_need)}</p><p className="tabular-nums text-muted-foreground">{usd(p.first_step_cost_usd)}</p></td><td className="p-3"><p>{p.package.map(n=>label('need',n)).join(' › ')}</p><p className="tabular-nums text-muted-foreground">{usd(p.package_cost_usd)}</p></td></tr>)}</tbody></table></div>
  <p className="mt-3 text-[10px] text-muted-foreground">Costs are rough estimates per need, to confirm with local partners: for example a solar kit {usd(3500)}, or 10 tablets with an offline server {usd(4000)}.</p></section></>;
}
