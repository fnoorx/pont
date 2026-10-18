// In-memory Store for tests and the offline simulator. Not for production use.
import type { Attendance, ReporterSnapshot, ReporterUpdate, Session, Submission } from "../engine/types.ts";
import type { MessageLogRow, NewReporter, Store } from "./store.ts";

type StoredReporter = ReporterSnapshot & { phoneHash: string; phoneE164: string | null; phoneLast4: string | null };

export class MemoryStore implements Store {
  processed = new Set<string>();
  reporters = new Map<string, StoredReporter>();
  sessions = new Map<string, Session & { reporterId: string }>();
  messages: MessageLogRow[] = [];
  uploads: { path: string; size: number; contentType: string }[] = [];
  submissions: { reporterId: string; submission: Submission; refCode: string }[] = [];
  attendance: ({ reporterId: string; school: string } & Attendance)[] = [];

  async markProcessed(sid: string): Promise<boolean> {
    if (this.processed.has(sid)) return false;
    this.processed.add(sid);
    return true;
  }

  async findOrCreateReporter(r: NewReporter): Promise<ReporterSnapshot> {
    const existing = [...this.reporters.values()].find((x) => x.phoneHash === r.phoneHash);
    if (existing) return { ...existing, lastSchoolName: this.lastSubmission(existing.id)?.submission.school.name ?? null };
    const created: StoredReporter = { id: `r${this.reporters.size + 1}`, language: null, role: null, consentAt: null, ...r };
    this.reporters.set(created.id, created);
    return created;
  }

  async loadActiveSession(reporterId: string): Promise<Session | null> {
    return [...this.sessions.values()].find((s) => s.reporterId === reporterId && s.status === "active") ?? null;
  }

  async saveSession(reporterId: string, s: Session): Promise<void> {
    const id = s.id ?? `s${this.sessions.size + 1}`;
    this.sessions.set(id, { ...s, id, reporterId });
  }

  async updateReporter(id: string, u: ReporterUpdate): Promise<void> {
    const r = this.reporters.get(id);
    if (!r) throw new Error(`unknown reporter ${id}`);
    this.reporters.set(id, {
      ...r,
      ...(u.language ? { language: u.language } : {}),
      ...(u.role ? { role: u.role } : {}),
      ...(u.consentAt ? { consentAt: u.consentAt } : {}),
    });
  }

  async logMessages(rows: MessageLogRow[]): Promise<void> {
    this.messages.push(...rows);
  }

  async uploadMedia(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
    this.uploads.push({ path, size: bytes.byteLength, contentType });
  }

  async submitAssessment(reporterId: string, submission: Submission): Promise<string> {
    const refCode = `PS-T${String(this.submissions.length + 1).padStart(3, "0")}`;
    this.submissions.push({ reporterId, submission, refCode });
    return refCode;
  }

  async submitAttendance(reporterId: string, attendance: Attendance): Promise<void> {
    const last = this.lastSubmission(reporterId);
    if (!last) throw new Error(`reporter ${reporterId} has no reported school`);
    this.attendance.push({ reporterId, school: last.submission.school.name, ...attendance });
  }

  private lastSubmission(reporterId: string) {
    return this.submissions.filter((s) => s.reporterId === reporterId).at(-1);
  }
}
