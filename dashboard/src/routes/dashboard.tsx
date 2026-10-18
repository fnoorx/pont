import { createFileRoute } from '@tanstack/react-router';
import { OperationsShell } from '@/components/operations/OperationsShell';
import { Overview } from '@/components/operations/Overview';
import { operationsHead } from '@/lib/operations';
export const Route=createFileRoute('/dashboard')({head:()=>operationsHead('Operations overview','PS43 partner reports, educational needs and project deployment overview in Cameroon.'),component:Page});
function Page(){return <OperationsShell><Overview/></OperationsShell>;}
