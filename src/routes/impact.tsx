import { createFileRoute } from '@tanstack/react-router';
import { OperationsShell } from '@/components/operations/OperationsShell';
import { Impact } from '@/components/operations/Impact';
import { operationsHead } from '@/lib/operations';
export const Route=createFileRoute('/impact')({head:()=>operationsHead('Impact & resource reports','Track PS43 allocated and delivered resources, delivery evidence and functionality without unsupported outcome claims.'),component:Page});
function Page(){return <OperationsShell><Impact/></OperationsShell>;}
