import { createFileRoute } from '@tanstack/react-router';
import { OperationsShell } from '@/components/operations/OperationsShell';
import { PartnerReports } from '@/components/operations/PartnerReports';
import { operationsHead } from '@/lib/operations';
export const Route=createFileRoute('/partner-reports')({validateSearch:(s:Record<string,unknown>): {status?: string;urgency?: string;category?: string;location?: string;record?: string} =>({status:typeof s['status']==='string'?s['status']:'',urgency:typeof s['urgency']==='string'?s['urgency']:'',category:typeof s['category']==='string'?s['category']:'',location:typeof s['location']==='string'?s['location']:'',record:typeof s['record']==='string'?s['record']:''}),head:()=>operationsHead('Partner reports','Review and verify simulated PS43 partner reports and infrastructure needs.'),component:Page});
function Page(){return <OperationsShell><PartnerReports/></OperationsShell>;}
