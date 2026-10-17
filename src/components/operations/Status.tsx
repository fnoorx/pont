import { Check, Clock3, CircleAlert, Circle } from 'lucide-react';
export function Status({value}:{value:string}){
 const good=['Verified','Functional','Delivered'].includes(value);const danger=['Critical','Delayed','Needs repair'].includes(value);const caution=['High','Unverified','Needs information','Under Review'].includes(value);
 const Icon=good?Check:danger?CircleAlert:caution?Clock3:Circle;
 return <span className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium ${good?'bg-primary/8 text-primary':danger?'bg-destructive/8 text-destructive':caution?'bg-warn/15 text-warning-ink':'bg-info/5 text-info'}`}><Icon className="size-3 shrink-0"/>{value}</span>;
}
