// Persistence used by the webhook handler. Kept as an interface so the handler
// can be tested without a database.
import type {
  Attendance,
  Channel,
  MilestoneReport,
  ProjectLookup,
  ReporterSnapshot,
  ReporterUpdate,
  Session,
  Submission,
} from "../engine/types.ts";

export interface NewReporter {
  /** NULL for the web channel, which has no phone number. */
  phoneE164: string | null;
  phoneHash: string;
  phoneLast4: string | null;
  channel: Channel;
}

export interface MessageLogRow {
  reporterId: string;
  direction: "inbound" | "outbound";
  body: string;
}

export interface Store {
  /** Records the message SID. Returns false if it was already processed. */
  markProcessed(messageSid: string): Promise<boolean>;
  findOrCreateReporter(reporter: NewReporter): Promise<ReporterSnapshot>;
  loadActiveSession(reporterId: string): Promise<Session | null>;
  saveSession(reporterId: string, session: Session): Promise<void>;
  updateReporter(reporterId: string, update: ReporterUpdate): Promise<void>;
  logMessages(rows: MessageLogRow[]): Promise<void>;
  uploadMedia(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** Writes school, assessment and media in one transaction. Returns the new ref_code. */
  submitAssessment(reporterId: string, submission: Submission): Promise<string>;
  /** Saves this week's attendance for the school from the reporter's latest report. */
  submitAttendance(reporterId: string, attendance: Attendance): Promise<void>;
  /** The project with this code (e.g. "PJ-104"), or null. */
  findProject(code: string): Promise<ProjectLookup | null>;
  /** Marks the project's next pending milestone done, waiting for a staff check. */
  reportMilestone(report: MilestoneReport): Promise<void>;
}
