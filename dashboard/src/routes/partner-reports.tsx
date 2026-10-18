import { createFileRoute } from '@tanstack/react-router';
import { OperationsShell } from '@/components/operations/OperationsShell';
import { PartnerReports } from '@/components/operations/PartnerReports';
import { operationsHead } from '@/lib/operations';
const text=(v:unknown)=>typeof v==='string'?v:'';
export const Route=createFileRoute('/partner-reports')({validateSearch:(s:Record<string,unknown>): {status?: string;need?: string;region?: string;channel?: string;record?: string} =>({status:text(s['status']),need:text(s['need']),region:text(s['region']),channel:text(s['channel']),record:text(s['record'])}),head:()=>operationsHead('Field reports','Review and verify school reports submitted through the Pont chat.'),component:Page});
function Page(){return <OperationsShell><PartnerReports/></OperationsShell>;}
