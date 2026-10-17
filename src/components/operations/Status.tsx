import { Check, Clock3, CircleAlert, Circle } from 'lucide-react';
const GOOD=['Verified','Good','Completed','Done','Proven'];
const DANGER=['Unsafe or no roof','Overdue'];
const CAUTION=['Unverified','Needs repairs','In progress','Pending','Referred'];
export function Status({value}:{value:string}){
 const good=GOOD.includes(value);const danger=DANGER.includes(value);const caution=CAUTION.includes(value);
 const Icon=good?Check:danger?CircleAlert:caution?Clock3:Circle;
 return <span className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium ${good?'bg-primary/8 text-primary':danger?'bg-destructive/8 text-destructive':caution?'bg-warn/15 text-warning-ink':'bg-info/5 text-info'}`}><Icon className="size-3 shrink-0"/>{value}</span>;
}
