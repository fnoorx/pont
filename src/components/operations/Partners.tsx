import { useState } from 'react';
import { Handshake, Link2, MapPin, ShieldCheck, Users } from 'lucide-react';
import { useOperations } from './OperationsProvider';
import { DataNotice, PageHeading } from './OperationsShell';
import { Status } from './Status';
import { fmtDate, label } from '@/lib/live';

const TRUST_ORDER={proven:0,referred:1,new:2} as const;

/** The trusted partner network: who can deliver what, where, and who vouched for them. */
export function Partners(){
 const {partners,matches,projects}=useOperations();
 const [region,setRegion]=useState('');const [trust,setTrust]=useState('');
 const list=partners
  .filter(p=>(!region||(region==='national'?p.region_code===null:p.region_name===region))&&(!trust||p.trust_level===trust))
  .sort((a,b)=>TRUST_ORDER[a.trust_level]-TRUST_ORDER[b.trust_level]||b.projects_completed-a.projects_completed||a.name.localeCompare(b.name));
 const counts={proven:partners.filter(p=>p.trust_level==='proven').length,referred:partners.filter(p=>p.trust_level==='referred').length,new:partners.filter(p=>p.trust_level==='new').length};
 return <><PageHeading title="Partners" subtitle="Local organisations that deliver. Partners join through a referral and earn trust by delivering."/><DataNotice kind="demo"/>
 <div className="mb-5 grid grid-cols-3 gap-3">{([['proven','Proven','Delivered projects for PS43',ShieldCheck],['referred','Referred','Vouched for by a trusted partner',Link2],['new','New','Joined recently, not yet tested',Users]] as const).map(([k,l,d,Icon])=><button key={k} onClick={()=>setTrust(trust===k?'':k)} className={`ops-panel p-4 text-left transition-colors ${trust===k?'border-primary':'hover:border-primary/35'}`}><Icon className="mb-3 size-4 text-primary"/><p className="text-2xl font-semibold tabular-nums">{counts[k]}</p><p className="mt-1 text-xs font-semibold">{l}</p><p className="mt-1 text-[10px] text-muted-foreground">{d}</p></button>)}</div>
 <div className="mb-5 flex flex-wrap items-center gap-3"><select aria-label="Filter partners by region" className="ops-input" value={region} onChange={e=>setRegion(e.target.value)}><option value="">All regions</option><option value="national">Nationwide</option>{[...new Set(partners.map(p=>p.region_name).filter((r):r is string=>Boolean(r)))].sort().map(r=><option key={r}>{r}</option>)}</select><span className="ml-auto text-xs text-muted-foreground">{list.length} partners</span></div>
 <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map(p=>{const matched=new Set(matches.filter(m=>m.partner_id===p.id).map(m=>m.school_id)).size;const active=projects.filter(x=>x.partner_id===p.id&&x.status!=='completed').length;return <article key={p.id} className="ops-panel p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-sm font-semibold leading-5">{p.name}</h2><p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><MapPin className="size-3"/>{p.region_name?`${p.town?`${p.town}, `:''}${p.region_name}`:'Nationwide'} · {label('partner_type',p.type)}</p></div><Status value={label('trust',p.trust_level)}/></div><div className="mt-3 flex flex-wrap gap-1.5">{p.services.map(s=><span key={s} className="rounded bg-muted px-2 py-0.5 text-[10px]">{label('need',s)}</span>)}</div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center"><div><p className="text-lg font-semibold tabular-nums">{p.projects_completed}</p><p className="text-[10px] text-muted-foreground">Delivered</p></div><div><p className="text-lg font-semibold tabular-nums">{active}</p><p className="text-[10px] text-muted-foreground">Active</p></div><div><p className="text-lg font-semibold tabular-nums">{matched}</p><p className="text-[10px] text-muted-foreground">Schools matched</p></div></div><p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Handshake className="size-3"/>{p.referred_by_name?<>Referred by <strong className="font-semibold text-foreground">{p.referred_by_name}</strong></>:'Founding partner'} · joined {fmtDate(p.joined_at)}</p></article>;})}</div>
 {!list.length&&<p className="py-12 text-center text-sm text-muted-foreground">No partners match these filters.</p>}</>;
}
