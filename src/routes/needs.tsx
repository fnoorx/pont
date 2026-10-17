import { createFileRoute } from '@tanstack/react-router';
import { OperationsShell } from '@/components/operations/OperationsShell';
import { Needs } from '@/components/operations/Needs';
import { operationsHead } from '@/lib/operations';
export const Route=createFileRoute('/needs')({validateSearch:(s:Record<string,unknown>)=>({view:typeof s.view==='string'?s.view:'list',location:typeof s.location==='string'?s.location:'',record:typeof s.record==='string'?s.record:''}),head:()=>operationsHead('Needs & priorities','Review explainable educational infrastructure priorities, missing data and staff recommendations.'),component:Page});
function Page(){return <OperationsShell><Needs/></OperationsShell>;}
