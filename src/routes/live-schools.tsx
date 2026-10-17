import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  db, type Row, schoolId, schoolName, region, condition, topNeed, needScore, rankByNeed,
  str, num, pick, fmtDate, label,
} from "@/lib/ps43";

const SchoolMap = lazy(() => import("@/components/SchoolMap"));
const REFRESH = 10_000;

export const Route = createFileRoute("/live-schools")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "PS43 Foundation — Schools dashboard" },
      { name: "description", content: "Map, need rankings and field reports for PS43 Foundation schools in Cameroon." },
      { property: "og:title", content: "PS43 Foundation — Schools dashboard" },
      { property: "og:description", content: "Map, need rankings and field reports for PS43 Foundation schools in Cameroon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

async function fetchView(name: string): Promise<Row[]> {
  const { data, error } = await db().from(name).select("*");
  if (error) throw new Error(`${name}: ${error.message}`);
  return (data ?? []) as Row[];
}

function Dashboard() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    db().auth.getUser().then(({ data }) => {
      if (!data.user) nav({ to: "/", replace: true });
      else { setEmail(data.user.email ?? ""); setReady(true); }
    });
    const { data: sub } = db().auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_OUT") nav({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const opts = { enabled: ready, refetchInterval: REFRESH };
  const schoolsQ = useQuery({ queryKey: ["schools"], queryFn: () => fetchView("dashboard_schools"), ...opts });
  const regionsQ = useQuery({ queryKey: ["regions"], queryFn: () => fetchView("dashboard_region_stats"), ...opts });

  const [selected, setSelected] = useState<string | null>(null);
  const [fRegion, setFRegion] = useState("");
  const [fCond, setFCond] = useState("");
  const [fNeed, setFNeed] = useState("");

  const schools = schoolsQ.data ?? [];
  const regions = regionsQ.data ?? [];
  const uniq = (f: (r: Row) => string) => [...new Set(schools.map(f).filter(Boolean))].sort();
  const ranked = useMemo(
    () => rankByNeed(schools).filter((s) =>
      (!fRegion || region(s) === fRegion) && (!fCond || condition(s) === fCond) && (!fNeed || topNeed(s) === fNeed)),
    [schools, fRegion, fCond, fNeed],
  );
  const current = schools.find((s) => schoolId(s) === selected);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await db().auth.signOut();
    nav({ to: "/", replace: true });
  }

  if (!ready) return <div className="p-10 text-sm text-muted-foreground">Checking your sign-in…</div>;
  const err = schoolsQ.error || regionsQ.error;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">PS43 Foundation</p>
          <h1 className="font-display text-2xl">Schools in Cameroon</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{email} · updates every 10s</span>
          <button onClick={signOut} className="rounded-md border border-border px-3 py-1.5 hover:bg-accent">Sign out</button>
        </div>
      </header>

      {err && <p className="mx-6 mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{(err as Error).message}</p>}

      <section className="grid gap-3 px-6 pt-6 sm:grid-cols-2 lg:grid-cols-5">
        {regions.map((r) => {
          const extras = Object.entries(r).filter(([k, v]) =>
            typeof v === "number" && !/lat|lng|lon|^id$/.test(k)).slice(0, 3);
          return (
            <button key={region(r)} onClick={() => setFRegion(fRegion === region(r) ? "" : region(r))}
              className={`rounded-lg border p-4 text-left transition ${fRegion === region(r) ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/40"}`}>
              <p className="font-display text-lg">{region(r) || "Unknown"}</p>
              {extras.map(([k, v]) => (
                <p key={k} className="text-xs text-muted-foreground">{label(k)}: <span className="font-semibold text-foreground">{Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span></p>
              ))}
            </button>
          );
        })}
      </section>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className="h-[460px]">
            <Suspense fallback={<div className="h-full rounded-lg border border-border bg-muted" />}>
              <SchoolMap schools={schools} regions={regions} selectedId={selected} onSelect={setSelected} />
            </Suspense>
          </div>

          <section className="rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <h2 className="mr-auto font-display text-lg">Ranked by need ({ranked.length})</h2>
              <Filter value={fRegion} onChange={setFRegion} all="All regions" options={uniq(region)} />
              <Filter value={fCond} onChange={setFCond} all="Any condition" options={uniq(condition)} />
              <Filter value={fNeed} onChange={setFNeed} all="Any top need" options={uniq(topNeed)} />
            </div>
            <ol className="max-h-[520px] divide-y divide-border overflow-auto">
              {ranked.map((s, i) => (
                <li key={schoolId(s)}>
                  <button onClick={() => setSelected(schoolId(s))}
                    className={`flex w-full items-center gap-4 px-4 py-3 text-left text-sm hover:bg-accent/40 ${selected === schoolId(s) ? "bg-accent/60" : ""}`}>
                    <span className="w-6 text-muted-foreground">{i + 1}</span>
                    <span className="flex-1">
                      <span className="font-medium">{schoolName(s)}</span>
                      <span className="block text-xs text-muted-foreground">{[region(s), condition(s), topNeed(s)].filter(Boolean).join(" · ")}</span>
                    </span>
                    {needScore(s) != null && <span className="rounded bg-warn/20 px-2 py-0.5 text-xs font-semibold">{needScore(s)}</span>}
                  </button>
                </li>
              ))}
              {!schoolsQ.isLoading && ranked.length === 0 && <li className="p-4 text-sm text-muted-foreground">No schools match these filters.</li>}
            </ol>
          </section>
        </div>

        <aside className="rounded-lg border border-border bg-card p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto">
          {current ? <Detail school={current} ready={ready} /> : <p className="text-sm text-muted-foreground">Select a school on the map or in the list to see its reports and photos.</p>}
        </aside>
      </div>
    </div>
  );
}

function Filter({ value, onChange, all, options }: { value: string; onChange: (v: string) => void; all: string; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
      <option value="">{all}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const HIDE = /^(id|assessment_id|school_id|verified|created_at|lat|lng|lat_display|lng_display)$/;

function Detail({ school, ready }: { school: Row; ready: boolean }) {
  const id = schoolId(school);
  const qc = useQueryClient();
  const assessQ = useQuery({
    queryKey: ["assessments", id],
    enabled: ready,
    refetchInterval: REFRESH,
    queryFn: async () => {
      const { data, error } = await db().from("dashboard_assessments").select("*").eq("school_id", id);
      if (error) throw error;
      return ((data ?? []) as Row[]).sort((a, b) =>
        String(pick(b, "assessed_at", "submitted_at", "created_at") ?? "").localeCompare(String(pick(a, "assessed_at", "submitted_at", "created_at") ?? "")));
    },
  });
  const mediaQ = useQuery({
    queryKey: ["media", id],
    enabled: ready,
    refetchInterval: REFRESH,
    queryFn: async () => {
      const { data, error } = await db().from("dashboard_media").select("*").eq("school_id", id);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const paths = rows.map((m) => str(m, "storage_path", "path", "file_path", "object_path")).filter(Boolean);
      if (!paths.length) return [];
      const { data: signed, error: e2 } = await db().storage.from("field-media").createSignedUrls(paths, 3600);
      if (e2) throw e2;
      return rows.map((m) => ({ row: m, url: signed?.find((s) => s.path === str(m, "storage_path", "path", "file_path", "object_path"))?.signedUrl ?? null }));
    },
  });
  const [pending, setPending] = useState<string | null>(null);
  const [toggleErr, setToggleErr] = useState("");

  async function toggle(a: Row) {
    const aid = str(a, "assessment_id", "id");
    setPending(aid);
    setToggleErr("");
    const { error } = await db().rpc("set_assessment_verified", { assessment_id: aid, verified: !pick(a, "verified") });
    setPending(null);
    if (error) setToggleErr(error.message);
    qc.invalidateQueries({ queryKey: ["assessments", id] });
    qc.invalidateQueries({ queryKey: ["schools"] });
  }

  const facts = Object.entries(school).filter(([k, v]) => v != null && v !== "" && typeof v !== "object" && !HIDE.test(k) && k !== "name" && k !== "school_name");

  return (
    <div>
      <h2 className="font-display text-2xl">{schoolName(school)}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {facts.map(([k, v]) => (<Fragment key={k}><dt className="text-muted-foreground">{label(k)}</dt><dd>{String(v)}</dd></Fragment>))}
      </dl>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-primary">Report history</h3>
      {toggleErr && <p className="mt-2 text-xs text-destructive">{toggleErr}</p>}
      {assessQ.error && <p className="mt-2 text-xs text-destructive">{(assessQ.error as Error).message}</p>}
      <ul className="mt-2 space-y-3">
        {(assessQ.data ?? []).map((a) => {
          const aid = str(a, "assessment_id", "id");
          const v = Boolean(pick(a, "verified"));
          return (
            <li key={aid} className="rounded-md border border-border p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">{fmtDate(pick(a, "assessed_at", "submitted_at", "created_at")) || "Report"}</span>
                <label className="flex cursor-pointer items-center gap-2">
                  <span className={v ? "text-primary" : "text-muted-foreground"}>{v ? "Verified" : "Unverified"}</span>
                  <input type="checkbox" checked={v} disabled={pending === aid} onChange={() => toggle(a)} className="h-4 w-4 accent-[var(--primary)]" />
                </label>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
                {Object.entries(a).filter(([k, x]) => x != null && x !== "" && typeof x !== "object" && !HIDE.test(k) && !/_at$/.test(k)).map(([k, x]) => (
                  <Fragment key={k}><dt className="text-muted-foreground">{label(k)}</dt><dd>{String(x)}</dd></Fragment>
                ))}
              </dl>
            </li>
          );
        })}
        {!assessQ.isLoading && !assessQ.data?.length && <li className="text-xs text-muted-foreground">No reports yet.</li>}
      </ul>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-primary">Photos</h3>
      {mediaQ.error && <p className="mt-2 text-xs text-destructive">{(mediaQ.error as Error).message}</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(mediaQ.data ?? []).map(({ row, url }, i) => url ? (
          <a key={i} href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={str(row, "caption", "description") || "Field photo"} className="aspect-square w-full rounded-md object-cover" loading="lazy" />
          </a>
        ) : null)}
      </div>
      {!mediaQ.isLoading && !mediaQ.data?.length && <p className="text-xs text-muted-foreground">No photos.</p>}
    </div>
  );
}
