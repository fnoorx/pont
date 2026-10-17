export type Report = {
  id: string; partner: string; school: string; location: string; category: string;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low'; date: string;
  status: 'Unverified' | 'Needs information' | 'Verified'; message: string;
  beneficiaries: number | null; safety: boolean | null; lat: number | null; lng: number | null;
  missing: string[]; verificationNote?: string;
  override?: { score: number; reason: string; at: string }; 
};
export const stages = ['Proposed', 'Under Review', 'Approved', 'In Progress', 'Delivered', 'Verified'] as const;
export type Stage = typeof stages[number];
export type Project = { id: string; name: string; school: string; location: string; partner: string; owner: string; stage: Stage; next: string; deadline: string; blockers: string[]; resource: string; allocated: number; delivered: number; functionality: 'Not assessed' | 'Functional' | 'Needs repair'; evidence?: string };
export type Audit = { id: string; text: string; at: string };
export const seedReports: Report[] = [
  {id:'RPT-0248', partner:'Marie N. · Community Link',school:'Government School Bafut',location:'Northwest',category:'Classroom repair',urgency:'Critical',date:'2026-10-17',status:'Unverified',message:'Good morning PS43. Heavy rain has damaged the roof of two classrooms at GS Bafut. Children cannot use these rooms safely. We have 186 learners. Please help us arrange an assessment and roofing sheets.',beneficiaries:186,safety:true,lat:6.08,lng:10.12,missing:['Site assessment photos']},
  {id:'RPT-0247', partner:'Paul E. · School Bridge',school:'École Publique de Mbalmayo',location:'Centre',category:'Water & sanitation',urgency:'High',date:'2026-10-17',status:'Unverified',message:'The school water pump is broken. 240 learners are collecting water from outside the school. Can a technician visit? We have not confirmed the repair cost.',beneficiaries:240,safety:true,lat:3.52,lng:11.5,missing:['Repair estimate']},
  {id:'RPT-0246',partner:'Amina B. · Northern Reach',school:'Community School Maroua',location:'Far North',category:'School furniture',urgency:'High',date:'2026-10-16',status:'Needs information',message:'We need desks for the new classroom near Maroua. Some learners are sitting on the floor. I will send the exact numbers and school location after my next visit.',beneficiaries:null,safety:null,lat:null,lng:null,missing:['Learner count','Exact location','Desk quantity']},
  {id:'RPT-0245',partner:'Daniel T. · Community Link',school:'Government School Limbe',location:'Southwest',category:'Classroom repair',urgency:'High',date:'2026-10-16',status:'Verified',message:'The site visit confirms 3 classroom doors need replacement. 92 learners use these rooms. Measurements and photos are attached to our assessment.',beneficiaries:92,safety:true,lat:4.02,lng:9.21,missing:[],verificationNote:'Site visit and measurements reviewed by staff.'},
  {id:'RPT-0244',partner:'Grace M. · School Bridge',school:'École Publique de Douala',location:'Littoral',category:'Learning materials',urgency:'Medium',date:'2026-10-15',status:'Unverified',message:'Requesting 80 learning kits for the primary classes. The teacher has shared the class list. We can distribute once the kits arrive.',beneficiaries:80,safety:false,lat:4.06,lng:9.71,missing:[]},
  {id:'RPT-0243',partner:'Samuel K. · Northern Reach',school:'Government School Ngaoundéré',location:'Adamawa',category:'Water & sanitation',urgency:'Medium',date:'2026-10-14',status:'Verified',message:'Handwashing station installation completed. The school committee confirmed the location and the 150 learners served. Requesting soap and maintenance supplies.',beneficiaries:150,safety:false,lat:7.32,lng:13.58,missing:[],verificationNote:'Committee confirmation reviewed.'},
  {id:'RPT-0242',partner:'Rose A. · Community Link',school:'Community School Bertoua',location:'East',category:'School furniture',urgency:'Low',date:'2026-10-13',status:'Verified',message:'We have checked the remaining furniture gap: 20 desks for 40 learners. Existing desks are still usable. This request can be planned for the next deployment.',beneficiaries:40,safety:false,lat:4.57,lng:13.68,missing:[],verificationNote:'Furniture inventory reviewed.'},
  {id:'RPT-0241',partner:'Jean P. · School Bridge',school:'École Publique de Bafoussam',location:'West',category:'Learning materials',urgency:'Medium',date:'2026-10-12',status:'Unverified',message:'The head teacher requests 60 learning kits. No urgent safety issue has been reported. We are waiting for the signed class list.',beneficiaries:60,safety:null,lat:5.48,lng:10.42,missing:['Signed class list']},
];
export const seedProjects: Project[] = [
  {id:'PRJ-041',name:'Bafut classroom roof repair',school:'Government School Bafut',location:'Northwest',partner:'Community Link',owner:'Emmanuel A.',stage:'Under Review',next:'Complete site assessment',deadline:'2026-10-21',blockers:['Site photos outstanding'],resource:'Roofing sheets',allocated:60,delivered:0,functionality:'Not assessed'},
  {id:'PRJ-040',name:'Mbalmayo water pump repair',school:'École Publique de Mbalmayo',location:'Centre',partner:'School Bridge',owner:'Claudine M.',stage:'In Progress',next:'Confirm technician visit',deadline:'2026-10-15',blockers:['Technician unavailable'],resource:'Water pumps',allocated:1,delivered:0,functionality:'Not assessed'},
  {id:'PRJ-039',name:'Maroua classroom desks',school:'Community School Maroua',location:'Far North',partner:'Northern Reach',owner:'Emmanuel A.',stage:'Proposed',next:'Confirm desk quantity',deadline:'2026-10-24',blockers:['Quantity not confirmed'],resource:'Desks',allocated:30,delivered:0,functionality:'Not assessed'},
  {id:'PRJ-038',name:'Limbe classroom doors',school:'Government School Limbe',location:'Southwest',partner:'Community Link',owner:'Claudine M.',stage:'Approved',next:'Confirm transport booking',deadline:'2026-10-16',blockers:['Transport booking delayed'],resource:'Doors',allocated:3,delivered:0,functionality:'Not assessed'},
  {id:'PRJ-037',name:'Douala learning kit delivery',school:'École Publique de Douala',location:'Littoral',partner:'School Bridge',owner:'Rose N.',stage:'Delivered',next:'Verify with school committee',deadline:'2026-10-18',blockers:[],resource:'Learning kits',allocated:80,delivered:80,functionality:'Not assessed'},
  {id:'PRJ-036',name:'Ngaoundéré handwashing station',school:'Government School Ngaoundéré',location:'Adamawa',partner:'Northern Reach',owner:'Rose N.',stage:'Verified',next:'Routine maintenance check',deadline:'2026-10-12',blockers:[],resource:'Handwashing stations',allocated:2,delivered:2,functionality:'Functional',evidence:'School committee sign-off and on-site functionality check, 12 Oct 2026.'},
  {id:'PRJ-035',name:'Bertoua furniture delivery',school:'Community School Bertoua',location:'East',partner:'Community Link',owner:'Emmanuel A.',stage:'In Progress',next:'Dispatch desks to school',deadline:'2026-10-22',blockers:[],resource:'Desks',allocated:20,delivered:10,functionality:'Not assessed'},
];
export function priority(r: Report) {
  const urgency = {Critical:50,High:35,Medium:20,Low:10}[r.urgency];
  const safety = r.safety === true ? 30 : 0;
  const reach = r.beneficiaries === null ? 0 : Math.min(20, Math.floor(r.beneficiaries / 10));
  return {score:r.override?.score ?? urgency+safety+reach,base:urgency+safety+reach,reasons:[`${urgency} urgency (${r.urgency.toLowerCase()})`,`${safety} safety (${r.safety === null ? 'unknown' : r.safety ? 'risk reported' : 'no risk reported'})`,`${reach} reach (${r.beneficiaries === null ? 'learner count unknown' : `${r.beneficiaries} learners`})`]};
}
export function overridePriority(r: Report, score: number, reason: string, at: string): Report {
  if (!reason.trim()) throw new Error('A reason is required to override a recommendation.');
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error('Score must be between 0 and 100.');
  return {...r,override:{score,reason:reason.trim(),at}};
}
export function isDelayed(p: Project, today: string) { return !['Delivered','Verified'].includes(p.stage) && p.deadline < today; }
export function updateProject(p: Project, stage: Stage, evidence: string, delivered: number, functionality: Project['functionality']): Project {
  if (!Number.isFinite(delivered) || delivered < 0 || delivered > p.allocated) throw new Error('Delivered quantity must be between zero and the allocation.');
  if (stage === 'Verified' && !evidence.trim()) throw new Error('Recorded delivery evidence is required for verification.');
  if (['Delivered','Verified'].includes(stage) && delivered === 0) throw new Error('Record delivered resources before marking a delivery.');
  return {...p,stage,evidence:evidence.trim() || undefined,delivered,functionality};
}
export function operationsHead(title: string, description: string) {return {meta:[{title:`${title} · PS43 Foundation`},{name:'description',content:description},{property:'og:title',content:`${title} · PS43 Foundation`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]};}
