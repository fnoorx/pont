import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, CircleAlert, MessageSquareText, ArrowUpRight, Camera, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOperations } from './OperationsProvider';
import { Status } from './Status';
import { BlockedBadge, Drawer, Photos, TierBadge } from './SchoolDetail';
import { ago, fmtDate, label, type Assessment } from '@/lib/live';

/** One field report from the Pont chat, with its answers, photos and the verify action. */
export function ReportDetail({report:a,onClose}:{report:Assessment;onClose:()=>void}){
 const {verify,media,readiness}=useOperations();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const photos=media.filter(m=>m.assessment_id===a.id&&m.type==='photo').map(m=>m.storage_path);
 const r=readiness.find(x=>x.latest_assessment_id===a.id);
 async function act(next:boolean){setBusy(true);setError('');try{await verify(a.id,next);}catch(e){setError(e instanceof Error?e.message:'Could not update this report.');}finally{setBusy(false);}}
 const facts:[string,string][]=[
  ['Students',label('enrollment_band',a.enrollment_band)],['Building',label('building_condition',a.building_condition)],
  ['Electricity',label('power_source',a.power_source)],['Mobile signal',label('connectivity',a.connectivity)],
  ['Devices',label('devices',a.devices)],['Biggest need',label('need',a.top_need)],
  ['Reported by',`${label('role',a.reporter_role)}${a.reporter_last4?` · phone ending ${a.reporter_last4}`:''}`],
  ['Channel',`${label('channel',a.reporter_channel)} · ${label('language',a.language)}`],
 ];
 return <Drawer title={a.school_name} kicker={`FIELD REPORT · ${a.ref_code}`} onClose={onClose}>
  <div className="mt-3 flex flex-wrap gap-2"><Status value={a.verified?'Verified':'Unverified'}/>{r&&<TierBadge tier={r.tier}/>}</div>
  <p className="mt-3 text-xs text-muted-foreground">{a.region_name} · {fmtDate(a.submitted_at)} ({ago(a.submitted_at)})</p>
  {a.is_sensitive&&<p className="mt-3 flex items-center gap-1.5 rounded bg-muted px-2 py-1.5 text-[11px] text-muted-foreground"><Lock className="size-3"/>Conflict-affected region: exact location withheld.</p>}
  <div className="mt-5 rounded-md border border-warn/30 bg-warn/8 p-3 text-xs leading-5 text-warning-ink">{a.verified?'Verified by PS43 staff. Verification applies to this report only, not to delivery or learning outcomes.':'Unverified field information. Check it with the reporter or a partner before committing resources.'}</div>
  <h3 className="mb-3 mt-6 text-sm font-semibold">Answers</h3>
  <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-y-2.5 text-xs">{facts.map(([k,v])=><div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
  {r?.blocked_by&&<div className="mt-4"><BlockedBadge r={r}/></div>}
  <h3 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="size-4 text-primary"/>Reporter's note</h3>
  <div className="rounded-md border border-border bg-muted/50 p-4 text-sm leading-6">{a.notes?`“${a.notes}”`:<span className="text-muted-foreground">No note added.</span>}</div>
  <h3 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold"><Camera className="size-4 text-primary"/>Photos</h3>
  <Photos paths={photos}/>
  <div className="mt-6 border-t border-border pt-5">
   {error&&<p role="alert" className="mb-2 text-xs text-destructive">{error}</p>}
   <div className="flex flex-wrap gap-2">{a.verified?<Button variant="outline" disabled={busy} onClick={()=>act(false)}><CircleAlert/>Remove verification</Button>:<Button disabled={busy} onClick={()=>act(true)}><Check/>Verify report</Button>}<Button asChild variant="ghost"><Link to="/needs" search={{record:a.school_id}}>Open school<ArrowUpRight/></Link></Button></div>
   <p className="mt-3 text-[10px] text-muted-foreground">Verification is saved to the database and raises the school's priority by 10 points.</p>
  </div>
 </Drawer>;
}
