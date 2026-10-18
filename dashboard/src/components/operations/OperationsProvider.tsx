import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/ps43';
import {
  fetchView, setMilestoneVerified, setVerified, REFRESH_MS,
  type Assessment, type Attendance, type ImpactSummary, type Match, type Media, type Milestone,
  type PackageCost, type Partner, type Priority, type Project, type Readiness, type RegionStat, type Resource, type School,
} from '@/lib/live';

// Live data for every operations page. Reads only the dashboard_* views from the Pont
// database, refreshes every 10 seconds, and only while a staff member is signed in.
type Data = {
  schools: School[]; assessments: Assessment[]; regions: RegionStat[]; media: Media[];
  readiness: Readiness[]; priority: Priority[]; partners: Partner[]; matches: Match[];
  projects: Project[]; milestones: Milestone[]; attendance: Attendance[]; impact: ImpactSummary | null;
  resources: Resource[]; packages: PackageCost[];
};
type State = Data & {
  session: 'checking' | 'signed-in' | 'signed-out'; email: string;
  loading: boolean; error: string; updatedAt: number;
  verify: (assessmentId: string, verified: boolean) => Promise<void>;
  verifyMilestone: (milestoneId: string) => Promise<void>;
  search: string; setSearch: (s: string) => void; notice: string; setNotice: (s: string) => void;
};

const VIEWS = [
  ['schools', 'dashboard_schools'], ['assessments', 'dashboard_assessments'], ['regions', 'dashboard_region_stats'],
  ['media', 'dashboard_media'], ['readiness', 'dashboard_readiness'], ['priority', 'dashboard_priority'],
  ['partners', 'dashboard_partners'], ['matches', 'dashboard_partner_matches'], ['projects', 'dashboard_projects'],
  ['milestones', 'dashboard_milestones'], ['attendance', 'dashboard_attendance'], ['impact', 'dashboard_impact_summary'],
  ['resources', 'dashboard_resources'], ['packages', 'dashboard_package_costs'],
] as const;

const Context = createContext<State | null>(null);

export function OperationsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<State['session']>('checking');
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    db().auth.getSession().then(({ data }) => {
      setSession(data.session ? 'signed-in' : 'signed-out');
      setEmail(data.session?.user.email ?? '');
    });
    const { data: sub } = db().auth.onAuthStateChange((_event, s) => {
      setSession(s ? 'signed-in' : 'signed-out');
      setEmail(s?.user.email ?? '');
      if (!s) qc.removeQueries({ queryKey: ['live'] });
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const results = useQueries({
    queries: VIEWS.map(([key, view]) => ({
      queryKey: ['live', key],
      queryFn: () => fetchView(view),
      enabled: session === 'signed-in',
      refetchInterval: REFRESH_MS,
    })),
  });

  type Key = (typeof VIEWS)[number][0];
  const data = Object.fromEntries(VIEWS.map(([key], i) => [key, results[i]?.data ?? []])) as Record<Key, unknown[]>;
  const firstError = results.find((r) => r.error)?.error;

  const value: State = {
    schools: data.schools as School[],
    assessments: [...(data.assessments as Assessment[])].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at)),
    regions: data.regions as RegionStat[],
    media: data.media as Media[],
    readiness: data.readiness as Readiness[],
    priority: [...(data.priority as Priority[])].sort((a, b) => a.priority_rank - b.priority_rank),
    partners: data.partners as Partner[],
    matches: [...(data.matches as Match[])].sort((a, b) => a.match_rank - b.match_rank),
    projects: data.projects as Project[],
    milestones: [...(data.milestones as Milestone[])].sort((a, b) => a.sort_order - b.sort_order),
    attendance: data.attendance as Attendance[],
    impact: ((data.impact as ImpactSummary[])[0] ?? null),
    resources: data.resources as Resource[],
    packages: [...(data.packages as PackageCost[])].sort((a, b) => (a.priority_rank ?? 999) - (b.priority_rank ?? 999)),
    session, email,
    loading: session === 'signed-in' && results.some((r) => r.isLoading),
    error: firstError instanceof Error ? firstError.message : '',
    updatedAt: Math.max(0, ...results.map((r) => r.dataUpdatedAt)),
    verify: async (assessmentId, verified) => {
      await setVerified(assessmentId, verified);
      await qc.invalidateQueries({ queryKey: ['live'] });
      setNotice(verified ? 'Report marked as verified.' : 'Verification removed.');
    },
    verifyMilestone: async (milestoneId) => {
      await setMilestoneVerified(milestoneId, true);
      await qc.invalidateQueries({ queryKey: ['live'] });
      setNotice('Milestone confirmed. When every milestone is confirmed, the project completes and the partner earns trust.');
    },
    search, setSearch, notice, setNotice,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOperations() {
  const s = useContext(Context);
  if (!s) throw new Error('OperationsProvider is missing');
  return s;
}
