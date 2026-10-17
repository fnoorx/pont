// Persistence used by the webhook handler. Kept as an interface so the handler
// can be tested without a database.
import type { Channel, ReporterSnapshot, ReporterUpdate, Session } from "../engine/types.ts";

export interface NewReporter {
  phoneE164: string;
  phoneHash: string;
  phoneLast4: string;
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
}
