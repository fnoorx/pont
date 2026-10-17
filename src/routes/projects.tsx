import { createFileRoute } from '@tanstack/react-router';
import { OperationsShell } from '@/components/operations/OperationsShell';
import { Projects } from '@/components/operations/Projects';
import { operationsHead } from '@/lib/operations';
export const Route=createFileRoute('/projects')({validateSearch:(s:Record<string,unknown>): {filter?: string;location?: string;record?: string} =>({filter:typeof s.filter==='string'?s.filter:'',location:typeof s.location==='string'?s.location:'',record:typeof s.record==='string'?s.record:''}),head:()=>operationsHead('Projects & deployment','Coordinate PS43 deployments, responsible partners, blockers and delivery verification.'),component:Page});
function Page(){return <OperationsShell><Projects/></OperationsShell>;}
