import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { LayoutDashboard, MessageSquareText, Layers3, FolderKanban, ChartNoAxesCombined, Handshake, Boxes, Search, Bell, Menu, ChevronLeft, ChevronRight, ArrowUpRight, CircleHelp, Radio, X, Check, MapPin, LogOut, TriangleAlert, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import symbol from '@/assets/ps43-logo.png';
import { db } from '@/lib/ps43';
import { ago, CHAT_URL } from '@/lib/live';
import { useOperations } from './OperationsProvider';
import { ThemeToggle } from '@/components/ThemeToggle';

// Ordered as the pipeline: Report → Assess → Match → Deliver → Prove. step 0 = the overview.
const links=[
 {to:'/dashboard',label:'Overview',hint:'The whole pipeline',step:0,icon:LayoutDashboard},
 {to:'/partner-reports',label:'Report',hint:'Field reports',step:1,icon:MessageSquareText},
 {to:'/needs',label:'Assess',hint:'Who to help first',step:2,icon:Layers3},
 {to:'/partners',label:'Match: partners',hint:'Who can deliver',step:3,icon:Handshake},
 {to:'/resources',label:'Match: resources',hint:'What PS43 can give',step:3,icon:Boxes},
 {to:'/projects',label:'Deliver',hint:'Projects',step:4,icon:FolderKanban},
 {to:'/impact',label:'Prove',hint:'Impact',step:5,icon:ChartNoAxesCombined},
] as const;

export function OperationsShell({children}:{children:ReactNode}){
 const [compact,setCompact]=useState(false);const [mobile,setMobile]=useState(false);const [hidden,setHidden]=useState(false);const [notifications,setNotifications]=useState(false);const [help,setHelp]=useState(false);
 const {search,setSearch,notice,setNotice,assessments,schools,projects,priority,session,email,error,updatedAt}=useOperations();
 const navigate=useNavigate();
 const [, tick]=useState(0);
 useEffect(()=>{const t=setInterval(()=>tick(n=>n+1),5000);return ()=>clearInterval(t);},[]);
 useEffect(()=>{if(session==='signed-out')navigate({to:'/auth',replace:true});},[session,navigate]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),4000);return ()=>clearTimeout(t);},[notice,setNotice]);

 const unverified=assessments.filter(a=>!a.verified).length;
 const blocked=priority.filter(p=>p.blocked_by).length;
 const q=search.trim().toLowerCase();
 const results=q?[
  ...schools.map(s=>({id:s.id,title:s.name,kind:`School · ${s.region_name}`,to:'/needs' as const})),
  ...assessments.map(a=>({id:a.id,title:`${a.ref_code} · ${a.school_name}`,kind:'Field report',to:'/partner-reports' as const})),
  ...projects.map(p=>({id:p.id,title:p.title,kind:`Project · ${p.school_name}`,to:'/projects' as const})),
 ].filter(r=>`${r.title} ${r.kind}`.toLowerCase().includes(q)).slice(0,8):[];
 const lastReport=assessments[0]?.submitted_at;

 if(session!=='signed-in') return <div className="flex min-h-screen items-center justify-center bg-background p-10 text-sm text-muted-foreground">Checking your sign-in…</div>;

 async function signOut(){await db().auth.signOut();navigate({to:'/auth',replace:true});}

 return <div className="min-h-screen bg-background text-foreground">
 {mobile&&<div className="fixed inset-0 z-[1000] bg-foreground/30 lg:hidden" onClick={()=>setMobile(false)}/>}
 <aside className={`fixed inset-y-0 left-0 z-[1001] flex flex-col border-r border-border bg-sidebar transition-[width,transform] ${compact?'lg:w-[76px]':'lg:w-[232px]'} w-[232px] ${mobile?'translate-x-0':hidden?'-translate-x-full':'-translate-x-full lg:translate-x-0'}`}>
  <Link to="/dashboard" className="flex h-[84px] shrink-0 items-center gap-3 px-6" onClick={()=>setMobile(false)}><img src={symbol} alt="PS43" className="h-10 w-14 object-contain"/>{!compact&&<div className="min-w-0"><p className="text-[21px] font-bold leading-none">PS43<span className="text-primary">.</span></p><p className="mt-1.5 text-[10px] font-semibold text-muted-foreground">FOUNDATION</p></div>}</Link>
  {!compact&&<p className="px-6 pb-3 pt-4 text-[10px] font-semibold text-muted-foreground">WORKSPACE</p>}
  <nav className="space-y-1 px-3" aria-label="Main navigation">{links.map(l=><Link key={l.to} to={l.to} title={compact?l.label:undefined} activeOptions={{exact:true}} onClick={()=>setMobile(false)} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-[13px] font-medium" activeProps={{className:'bg-accent text-primary'}} inactiveProps={{className:'text-muted-foreground hover:bg-muted'}}>{compact||!l.step?<l.icon className="size-[18px] shrink-0"/>:<span className="flex size-[18px] shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-semibold">{l.step}</span>}{!compact&&<span className="min-w-0 leading-tight"><span className="block">{l.label}</span><span className="block text-[10px] font-normal opacity-70">{l.hint}</span></span>}{!compact&&l.to==='/partner-reports'&&unverified>0&&<span className="ml-auto text-[11px]">{unverified}</span>}</Link>)}</nav>
  <div className="mt-auto space-y-4 p-4">
   {!compact&&<div className="rounded-md border border-border bg-background p-3"><div className="flex items-center gap-2 text-xs font-semibold"><Radio className="size-3.5 text-primary"/>Field intake</div><p className="mt-2 text-[11px] text-muted-foreground">Web chat and WhatsApp · live</p><a href={CHAT_URL} className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">Open the chat<ArrowUpRight className="size-3"/></a><div className="mt-3 space-y-1 border-t border-border pt-2 text-[10px] text-muted-foreground"><p>Last report: {lastReport?ago(lastReport):'none yet'}</p><p>{assessments.length} reports · {schools.length} schools</p><p>Updates every 10 seconds</p></div></div>}
   <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground" title="Live school map"><Link to="/live-schools"><MapPin/>{!compact&&'Live school map'}</Link></Button>
   <Button variant="ghost" className="w-full justify-start text-muted-foreground" title="Workspace information" onClick={()=>setHelp(true)}><CircleHelp/>{!compact&&'Workspace information'}</Button>
   <div className="flex items-center gap-3 border-t border-border pt-4"><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-primary">PS</div>{!compact&&<div className="min-w-0"><p className="truncate text-xs font-semibold">{email||'PS43 staff'}</p><button onClick={signOut} className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"><LogOut className="size-3"/>Sign out</button></div>}<Button size="icon" variant="ghost" className="ml-auto hidden h-7 w-7 shrink-0 lg:flex" title={compact?'Expand navigation':'Collapse navigation'} aria-label={compact?'Expand navigation':'Collapse navigation'} onClick={()=>setCompact(!compact)}>{compact?<ChevronRight/>:<ChevronLeft/>}</Button></div>
  </div>
 </aside>
 <div className={hidden?'lg:pl-0':compact?'lg:pl-[76px]':'lg:pl-[232px]'}>
  <header className="relative z-[700] grid h-[72px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 sm:px-8">
   <Button variant="ghost" size="icon" aria-label="Open navigation" className="lg:hidden" onClick={()=>setMobile(true)}><Menu/></Button>
   <Button variant="ghost" size="icon" aria-label={hidden?'Show sidebar':'Hide sidebar'} title={hidden?'Show sidebar':'Hide sidebar'} className="hidden lg:inline-flex" onClick={()=>setHidden(!hidden)}><Menu/></Button>
   <div className="relative min-w-0 max-w-[470px]"><Search className="pointer-events-none absolute left-0 top-2 size-[18px] text-muted-foreground"/><input aria-label="Search schools, reports, projects" className="h-9 w-full min-w-0 bg-transparent pl-8 pr-3 text-[13px] outline-none placeholder:text-muted-foreground" placeholder="Search schools, reports, projects…" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<div className="absolute left-0 right-0 top-12 rounded-md border border-border bg-card p-2 shadow-lg">{results.length?results.map(r=><Link key={`${r.kind}-${r.id}`} to={r.to} search={{record:r.id}} onClick={()=>setSearch('')} className="flex gap-3 rounded p-3 text-xs hover:bg-muted"><Search className="size-4 text-muted-foreground"/><span><span className="block font-semibold">{r.title}</span><span className="mt-1 block text-muted-foreground">{r.kind}</span></span></Link>):<p className="p-3 text-xs text-muted-foreground">No matching records.</p>}</div>}</div>
   <div className="flex shrink-0 items-center gap-4"><Button asChild size="sm" title="Open the WhatsApp-style chat schools use to report"><a href={CHAT_URL}><MessageCircle/><span className="hidden md:inline">Try the WhatsApp chat</span><span className="md:hidden">Chat</span><ArrowUpRight className="hidden md:inline"/></a></Button><ThemeToggle/><span className="hidden text-[11px] text-muted-foreground sm:flex sm:items-center sm:gap-1.5"><span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60"/><span className="relative inline-flex size-1.5 rounded-full bg-primary"/></span>Live{updatedAt?` · updated ${ago(new Date(updatedAt).toISOString())}`:''}</span><div className="relative"><Button variant="ghost" size="icon" aria-label="Notifications" onClick={()=>setNotifications(!notifications)} className="relative"><Bell className="text-muted-foreground"/>{unverified>0&&<span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-destructive"/>}</Button>{notifications&&<div className="absolute right-0 top-12 w-[280px] rounded-lg border border-border bg-card p-4 shadow-lg"><p className="mb-3 text-sm font-semibold">Needs your attention</p><Link to="/partner-reports" search={{status:'pending'}} onClick={()=>setNotifications(false)} className="block border-t border-border py-3 text-xs">{unverified} field reports awaiting verification <ArrowUpRight className="float-right size-3"/></Link><Link to="/needs" onClick={()=>setNotifications(false)} className="block border-t border-border py-3 text-xs">{blocked} schools need a prerequisite first <ArrowUpRight className="float-right size-3"/></Link></div>}</div><div className="hidden h-6 border-l border-border sm:block"/><span className="hidden size-8 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-primary sm:flex">PS</span></div>
  </header>
  {error&&<div role="alert" className="mx-4 mt-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/8 p-3 text-xs text-destructive sm:mx-8"><TriangleAlert className="size-4 shrink-0"/>Could not load live data: {error}</div>}
  <main className="ops-content mx-auto max-w-[1600px] px-4 py-7 sm:px-8">{children}</main>
  <footer className="mx-4 flex flex-wrap justify-between gap-2 border-t border-border py-4 text-[10px] text-muted-foreground sm:mx-8"><span>PS43 Foundation · Operations workspace</span><span>Field reports, readiness, priorities and new attendance counts are live · Partners, resources, projects and past attendance are demo data</span></footer>
 </div>
 {notice&&<div role="status" className="fixed bottom-6 right-4 z-[1300] flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-lg border border-primary/20 bg-card p-4 text-xs shadow-lg"><Check className="size-4 shrink-0 text-primary"/>{notice}<Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Dismiss notification" onClick={()=>setNotice('')}><X/></Button></div>}
 {help&&<div className="fixed inset-0 z-[1200] flex items-center justify-center bg-foreground/30 p-4"><div role="dialog" aria-modal="true" aria-label="Workspace information" className="ops-panel max-w-lg p-6"><div className="flex justify-between"><h2 className="text-lg font-semibold">Workspace information</h2><Button size="icon" variant="ghost" aria-label="Close workspace information" onClick={()=>setHelp(false)}><X/></Button></div><p className="mt-4 text-sm leading-6 text-muted-foreground">Field reports come in live from the Pont chat (web and WhatsApp). Readiness scores, priorities and partner matches are calculated from them with transparent rules, and update within 10 seconds.</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Partners, resources, projects, milestones and past attendance are fictional demo data that show how delivery and impact would be tracked. Schools can send real weekly attendance from the chat. Schools in conflict-affected regions never show an exact location.</p><Button asChild variant="outline" className="mt-5"><Link to="/live-schools"><MapPin/>Live school map<ArrowUpRight/></Link></Button></div></div>}
 </div>;
}
export function PageHeading({title,subtitle,action,step}:{title:string;subtitle:string;action?:ReactNode;step?:{n:number;name:string}}) {return <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"><div className="min-w-0">{step?<p className="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-wide text-primary"><span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">{step.n}</span>STEP {step.n} OF 5 · {step.name.toUpperCase()}</p>:<p className="mb-2 flex items-center gap-2 text-[10px] font-medium text-muted-foreground">OPERATIONS <span className="text-border">/</span> <span className="text-primary">CAMEROON</span></p>}<h1 className="text-[27px] font-semibold leading-tight">{title}</h1><p className="mt-2 text-[13px] leading-5 text-muted-foreground">{subtitle}</p></div>{action}</div>;}
/** Says whether a page shows live field data or fictional demo data. */
export function DataNotice({kind}:{kind:'live'|'demo'}){return kind==='live'
 ?<div className="mb-6 flex items-center gap-2.5 rounded-md border border-primary/25 bg-primary/5 px-3 py-2.5 text-[11px] text-primary"><Radio className="size-3.5 shrink-0"/><span><strong className="font-semibold">Live data.</strong> Reports from the Pont chat appear here within 10 seconds.</span></div>
 :<div className="mb-6 flex items-center gap-2.5 rounded-md border border-warn/30 bg-warn/8 px-3 py-2.5 text-[11px] text-warning-ink"><Radio className="size-3.5 shrink-0"/><span><strong className="font-semibold">Demo data.</strong> Partners, resources, projects and past attendance are fictional, to show how delivery and impact would be tracked.</span></div>;}
