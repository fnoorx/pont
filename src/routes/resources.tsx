import { createFileRoute } from '@tanstack/react-router';
import { OperationsShell } from '@/components/operations/OperationsShell';
import { Resources } from '@/components/operations/Resources';
import { operationsHead } from '@/lib/operations';
export const Route=createFileRoute('/resources')({head:()=>operationsHead('Resources','Equipment, funding and expertise PS43 can deploy, and which schools can use each one now.'),component:Page});
function Page(){return <OperationsShell><Resources/></OperationsShell>;}
