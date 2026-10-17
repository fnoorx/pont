import { createContext, useContext, useState, type ReactNode } from 'react';
import { seedReports, seedProjects, type Report, type Project, type Audit } from '@/lib/operations';
type State = {reports:Report[]; projects:Project[]; audit:Audit[]; setReport:(report:Report,text:string)=>void; setProject:(project:Project,text:string)=>void; search:string;setSearch:(s:string)=>void; notice:string; setNotice:(s:string)=>void;today:string};
const Context=createContext<State | null>(null);
export function OperationsProvider({children}:{children:ReactNode}) {
 const [reports,setReports]=useState<Report[]>(seedReports);const [projects,setProjects]=useState<Project[]>(seedProjects);const [audit,setAudit]=useState<Audit[]>([]);const [search,setSearch]=useState('');const [notice,setNotice]=useState('');
 const record=(text:string)=>{setAudit(a=>[{id:crypto.randomUUID(),text,at:new Date().toISOString()},...a]);setNotice(text);};
 return <Context.Provider value={{reports,projects,audit,search,setSearch,notice,setNotice,today:'2026-10-17',setReport:(r,t)=>{setReports(a=>a.map(x=>x.id===r.id?r:x));record(t);},setProject:(p,t)=>{setProjects(a=>a.map(x=>x.id===p.id?p:x));record(t);}}}>{children}</Context.Provider>;
}
export function useOperations(){const s=useContext(Context);if(!s)throw new Error('OperationsProvider is missing');return s;}
