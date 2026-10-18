import { createFileRoute } from '@tanstack/react-router';
import { OperationsShell } from '@/components/operations/OperationsShell';
import { Overview } from '@/components/operations/Overview';
import { operationsHead } from '@/lib/operations';
export const Route=createFileRoute('/')({head:()=>operationsHead('PS43 operations workspace','Coordinate educational infrastructure reports, needs and deployments with the PS43 Foundation.'),component:Page});
function Page(){return <OperationsShell><Overview/></OperationsShell>;}
