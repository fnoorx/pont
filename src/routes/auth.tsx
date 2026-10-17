import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db } from "@/lib/ps43";
import { Button } from "@/components/ui/button";
import symbol from "@/assets/ps43-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "PS43 Foundation — Staff sign in" },
      { name: "description", content: "Staff sign in for the PS43 Foundation schools dashboard." },
      { property: "og:title", content: "PS43 Foundation — Staff sign in" },
      { property: "og:description", content: "Staff sign in for the PS43 Foundation schools dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    db().auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/live-schools", replace: true });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await db().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr(error.message);
    nav({ to: "/live-schools", replace: true });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4 font-sans">
      <ThemeToggle className="absolute right-4 top-4" />
      <form onSubmit={submit} className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex h-1.5">
          <span className="flex-1 bg-primary" /><span className="flex-1 bg-secondary" /><span className="flex-1 bg-info" /><span className="flex-1 bg-destructive" />
        </div>
        <div className="p-8">
          <img src={symbol} alt="PS43 Foundation" className="mb-4 h-14 w-11 object-contain" />
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">PS43 Foundation</p>
          <h1 className="mt-2 font-display text-3xl text-info">Staff dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your staff account.</p>
          <label className="mt-6 block text-sm font-medium">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-2 focus:outline-primary" />
          <label className="mt-4 block text-sm font-medium">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-2 focus:outline-primary" />
          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
          <Button disabled={busy} type="submit"
            className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <Button variant="link" asChild className="mt-3 w-full text-info"><Link to="/dashboard">Operations demo workspace</Link></Button>
        </div>
      </form>
    </main>
  );
}
