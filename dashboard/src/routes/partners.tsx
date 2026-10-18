import { createFileRoute } from '@tanstack/react-router';
import { OperationsShell } from '@/components/operations/OperationsShell';
import { Partners } from '@/components/operations/Partners';
import { operationsHead } from '@/lib/operations';
export const Route=createFileRoute('/partners')({head:()=>operationsHead('Partners','The trusted partner network: who can deliver what, where, and who referred them.'),component:Page});
function Page(){return <OperationsShell><Partners/></OperationsShell>;}
