import { useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowUpRight, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOperations } from './OperationsProvider';
import { DataNotice, PageHeading } from './OperationsShell';
import { ReportDetail } from './ReportDetail';
import { Status } from './Status';
import { ago, label } from '@/lib/live';

/** Every field report submitted through the Pont chat (web chat, WhatsApp or SMS). */
export function PartnerReports(){const {assessments,search:global}=useOperations();const search=useSearch({from:'/partner-reports'});const navigate=useNavigate({from:'/partner-reports'});
 const set=(key:string,value:string)=>navigate({search:prev=>({...prev,[key]:value})});
 const filtered=assessments.filter(a=>(!search.status||(search.status==='pending'?!a.verified:search.status==='verified'?a.verified:true))&&(!search.need||a.top_need===search.need)&&(!search.region||a.region_name===search.region)&&(!search.channel||a.reporter_channel===search.channel)&&`${a.ref_code} ${a.school_name} ${a.region_name}`.toLowerCase().includes(global.toLowerCase()));
 const selected=assessments.find(a=>a.id===search.record);
 const filters:[string,string,[string,string][]][]=[
  ['status','All statuses',[['pending','Awaiting verification'],['verified','Verified']]],
  ['need','All needs',[...new Set(assessments.map(a=>a.top_need))].map(n=>[n,label('need',n)])],
  ['region','All regions',[...new Set(assessments.map(a=>a.region_name))].sort().map(r=>[r,r])],
  ['channel','All channels',[...new Set(assessments.map(a=>a.reporter_channel).filter((c):c is string=>Boolean(c)))].map(c=>[c,label('channel',c)])],
 ];
 return <><PageHeading title="Field Reports" subtitle="Every school report from the Pont chat. Review what was reported and verify it."/><DataNotice kind="live"/><div className="mb-4 flex flex-wrap items-center gap-3"><SlidersHorizontal className="size-4 text-muted-foreground"/>{filters.map(([key,all,options])=><select key={key} aria-label={all} className="ops-input" value={String(search[key as keyof typeof search]??'')} onChange={e=>set(key,e.target.value)}><option value="">{all}</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>)}<Button variant="ghost" size="icon" aria-label="Reset report filters" onClick={()=>navigate({search:{}})}><RotateCcw/></Button><span className="ml-auto text-xs text-muted-foreground">{filtered.length} reports</span></div><div className="ops-panel overflow-x-auto"><table className="ops-table w-full min-w-[900px]"><thead><tr><th>REFERENCE</th><th>SCHOOL</th><th>BIGGEST NEED</th><th>BUILDING</th><th>REPORTED BY</th><th>SUBMITTED</th><th>VERIFICATION</th><th/></tr></thead><tbody>{filtered.map(a=><tr key={a.id}><td><Button variant="link" className="h-auto p-0 text-xs" onClick={()=>set('record',a.id)}>{a.ref_code}</Button></td><td><p className="font-medium">{a.school_name}</p><p className="mt-1 text-[10px] text-muted-foreground">{a.region_name}</p></td><td>{label('need',a.top_need)}</td><td><Status value={label('building_condition',a.building_condition)}/></td><td><p>{label('role',a.reporter_role)}</p><p className="mt-1 text-[10px] text-muted-foreground">{label('channel',a.reporter_channel)}</p></td><td className="whitespace-nowrap">{ago(a.submitted_at)}</td><td><Status value={a.verified?'Verified':'Unverified'}/></td><td><Button size="icon" variant="ghost" aria-label={`Open ${a.ref_code}`} onClick={()=>set('record',a.id)}><ArrowUpRight/></Button></td></tr>)}</tbody></table>{!filtered.length&&<div className="p-12 text-center"><p className="text-sm font-semibold">No matching reports</p><p className="mt-2 text-xs text-muted-foreground">No records match the selected filters.</p><Button variant="outline" className="mt-4" onClick={()=>navigate({search:{}})}>Clear filters</Button></div>}</div>{selected&&<ReportDetail key={selected.id} report={selected} onClose={()=>set('record','')}/>}</>;
}
