import { describe,it,expect } from 'vitest';
import { seedReports,seedProjects,priority,overridePriority,updateProject,isDelayed,stages } from '@/lib/operations';
describe('Operations rules',()=>{
 it('records a reason for every priority override',()=>{const r=seedReports[0];if(!r)throw Error('Missing fixture');expect(()=>overridePriority(r,90,' ', '2026-10-17')).toThrow();expect(overridePriority(r,90,'Verified urgent roof damage','2026-10-17').override?.reason).toBe('Verified urgent roof damage');});
 it('keeps unknown assessment fields unknown and explains their contribution',()=>{const r=seedReports[2];if(!r)throw Error('Missing fixture');expect(r.beneficiaries).toBeNull();expect(r.safety).toBeNull();expect(priority(r).score).toBe(35);expect(priority(r).reasons).toContain('0 safety (unknown)');});
 it('requires recorded evidence to verify delivery',()=>{const p=seedProjects[4];if(!p)throw Error('Missing fixture');expect(()=>updateProject(p,'Verified','',80,'Functional')).toThrow();expect(updateProject(p,'Verified','Committee receipt',80,'Functional').evidence).toBe('Committee receipt');});
 it('does not count delivered or verified projects as delayed',()=>{const p=seedProjects[4];if(!p)throw Error('Missing fixture');expect(isDelayed({...p,stage:'In Progress'},'2026-10-20')).toBe(true);expect(isDelayed(p,'2026-10-20')).toBe(false);});
 it('uses all six requested deployment stages',()=>{expect([...stages]).toEqual(['Proposed','Under Review','Approved','In Progress','Delivered','Verified']);});
});
