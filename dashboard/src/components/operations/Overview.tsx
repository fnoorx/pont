import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, ChevronRight, Lock, MessageCircle } from 'lucide-react';
import { useOperations } from './OperationsProvider';
import { PageHeading } from './OperationsShell';
import { LocationMap } from './LocationMap';
import { CHAT_URL, label, pct, unlockLine, usd } from '@/lib/live';

type StageLink={to:'/partner-reports'|'/needs'|'/partners'|'/resources'|'/projects'|'/impact';text:string;search?:Record<string,string>};
type Stage={step:number;name:string;question:string;value:string;detail:string;live:boolean;links:StageLink[]};
type Action={text:string;to:StageLink['to'];search?:Record<string,string>};

/** The whole pipeline on one screen: Report → Assess → Match → Deliver → Prove, then what to do next. */
export function Overview(){
 const {assessments,schools,priority,matches,resources,packages,projects,milestones,impact,loading}=useOperations();const navigate=useNavigate();
 const pending=assessments.filter(a=>!a.verified).length;
 const blocked=priority.filter(p=>p.blocked_by).length;
 const matched=new Set(matches.map(m=>m.school_id)).size;
 const active=projects.filter(p=>p.status==='in_progress').length;
 const toCheck=milestones.filter(m=>m.status==='done'&&!m.verified).length;
 const withheld=schools.filter(s=>s.lat_display==null).length;
 const n=(v:number)=>loading?'…':String(v);
 const stages:Stage[]=[
  {step:1,name:'Report',question:'What do schools need?',value:n(assessments.length),detail:`reports from the chat · ${pending} to verify`,live:true,links:[{to:'/partner-reports',text:'Verify reports',search:{status:'pending'}}]},
  {step:2,name:'Assess',question:'Who do we help first?',value:n(priority.length),detail:`schools scored · ${blocked} need a cheaper fix first`,live:true,links:[{to:'/needs',text:'See the ranking'}]},
  {step:3,name:'Match',question:'Who delivers, with what?',value:n(matched),detail:`schools matched to a trusted partner · ${resources.length} resources ready`,live:false,links:[{to:'/partners',text:'Partners'},{to:'/resources',text:'Resources'}]},
  {step:4,name:'Deliver',question:'Is the work getting done?',value:n(active),detail:`projects under way · ${toCheck} milestone${toCheck===1?'':'s'} to confirm`,live:false,links:[{to:'/projects',text:'Track projects'}]},
  {step:5,name:'Prove',question:'Did it make a difference?',value:impact?.attendance_after!=null?`${pct(impact.attendance_before)} → ${pct(impact.attendance_after)}`:'n/a',detail:'attendance before and after a finished project',live:false,links:[{to:'/impact',text:'See impact'}]},
 ];

 const first=packages[0];
 const stuck=[...resources].sort((a,b)=>b.schools_blocked-a.schools_blocked).find(r=>r.schools_blocked>0);
 const actions:Action[]=[
  ...(pending?[{text:`Verify ${pending} new field report${pending===1?'':'s'} before committing resources`,to:'/partner-reports' as const,search:{status:'pending'}}]:[]),
  ...(first?[{text:`Help ${first.school_name} first: fund ${label('need',first.recommended_need).toLowerCase()} (about ${usd(first.first_step_cost_usd)})`,to:'/needs' as const,search:{record:first.school_id}}]:[]),
  ...(toCheck?[{text:`Confirm ${toCheck} milestone${toCheck===1?'':'s'} partners sent from the chat`,to:'/projects' as const}]:[]),
  ...(stuck?[{text:`${stuck.name}: ${unlockLine(stuck)}`,to:'/resources' as const}]:[]),
 ];

 return <>
 <PageHeading title="Overview" subtitle="From a school's first message to proof that the help worked, in five steps."/>
 <a href={CHAT_URL} className="ops-panel mb-6 flex flex-wrap items-center gap-4 border-primary/30 bg-primary/5 p-4 hover:bg-primary/10"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><MessageCircle className="size-5"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Report a school yourself</span><span className="mt-0.5 block text-xs text-muted-foreground">Open the WhatsApp-style chat a headteacher would use, in English or French. Your report appears here within 10 seconds.</span></span><span className="flex items-center gap-1 text-xs font-semibold text-primary">Open the chat<ArrowUpRight className="size-3.5"/></span></a>
 <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{stages.map((s,i)=><li key={s.step} className="relative"><div className="ops-panel flex h-full flex-col p-4"><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{s.step}</span><span className="text-sm font-semibold">{s.name}</span></span><span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${s.live?'bg-primary/10 text-primary':'bg-warn/15 text-warning-ink'}`}>{s.live?'LIVE':'DEMO'}</span></div><p className="mt-2 text-[11px] text-muted-foreground">{s.question}</p><p className="mt-3 text-[28px] font-semibold leading-none tabular-nums">{s.value}</p><p className="mt-2 flex-1 text-[11px] leading-4 text-muted-foreground">{s.detail}</p><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-3">{s.links.map(l=><Link key={l.to} to={l.to} search={l.search??{}} className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">{l.text}<ArrowRight className="size-3"/></Link>)}</div></div>{i<stages.length-1&&<ChevronRight aria-hidden className="absolute -right-3 top-1/2 z-10 hidden size-4 -translate-y-1/2 rounded-full bg-background text-muted-foreground xl:block"/>}</li>)}</ol>
 <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
  <section className="min-w-0"><h2 className="mb-3 text-sm font-semibold">Do next</h2><ol className="ops-panel divide-y divide-border">{actions.map((a,i)=><li key={a.text}><Link to={a.to} search={a.search??{}} className="flex items-center gap-3 p-4 text-[13px] hover:bg-muted/50"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">{i+1}</span><span className="min-w-0 flex-1">{a.text}</span><ChevronRight className="size-4 shrink-0 text-muted-foreground"/></Link></li>)}{!actions.length&&<li className="p-6 text-sm text-muted-foreground">{loading?'Loading…':'Nothing waiting. New reports will appear here.'}</li>}</ol></section>
  <section className="min-w-0"><h2 className="mb-3 text-sm font-semibold">Where the schools are</h2><div className="ops-panel overflow-hidden"><div className="h-[300px]"><LocationMap onSelect={id=>navigate({to:'/needs',search:{record:id}})}/></div><div className="flex items-start gap-2 border-t border-border px-4 py-3 text-[10px] text-muted-foreground"><Lock className="size-3.5 shrink-0 text-warning-ink"/><span>{withheld} schools in conflict-affected regions have no pin. They are counted in their region marker only.</span></div></div></section>
 </div></>;
}
