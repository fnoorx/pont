import { describe, it, expect } from 'vitest';
import { ago, attendanceSeries, blockedBadge, label, pct, type Attendance } from '@/lib/live';

describe('Live data helpers', () => {
  it('labels contract values for staff, and falls back safely', () => {
    expect(label('need', 'computers')).toBe('Computers');
    expect(label('building_condition', 'unsafe')).toBe('Unsafe or no roof');
    expect(label('channel', 'web')).toBe('Web chat');
    expect(label('tier', 'tier1')).toBe('Tier 1 · Offline digital');
    expect(label('need', 'something_new')).toBe('something_new');
    expect(label('need', null)).toBe('Unknown');
  });

  it('explains what blocks a stated need', () => {
    expect(blockedBadge({ stated_need: 'computers', blocked_by: 'power' })).toBe('Asked for computers · needs power first');
    expect(blockedBadge({ stated_need: 'internet', blocked_by: 'signal' })).toBe('Asked for internet · needs mobile signal (or satellite) first');
    expect(blockedBadge({ stated_need: 'training', blocked_by: null })).toBeNull();
  });

  it('formats attendance rates as whole percentages', () => {
    expect(pct(0.817)).toBe('82%');
    expect(pct(null)).toBe('n/a');
  });

  it('groups weekly attendance into one ordered series per school', () => {
    const row = (school_id: string, school_name: string, week_start: string, attendance_rate: number): Attendance =>
      ({ school_id, school_name, region_code: 'CE', week_start, students_present: 0, students_enrolled: 1, attendance_rate });
    const series = attendanceSeries([
      row('b', 'Zebra School', '2026-10-12', 0.8),
      row('a', 'Acacia School', '2026-10-12', 0.7),
      row('a', 'Acacia School', '2026-10-05', 0.6),
    ]);
    expect(series.map((s) => s.schoolName)).toEqual(['Acacia School', 'Zebra School']);
    expect(series[0]?.points.map((p) => p.week)).toEqual(['2026-10-05', '2026-10-12']);
  });

  it('describes how long ago something happened', () => {
    const now = Date.parse('2026-10-17T12:00:00Z');
    expect(ago('2026-10-17T11:59:30Z', now)).toBe('just now');
    expect(ago('2026-10-17T11:45:00Z', now)).toBe('15 min ago');
    expect(ago('2026-10-15T12:00:00Z', now)).toBe('2 days ago');
  });
});
