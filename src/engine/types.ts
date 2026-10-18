// The engine contract. The inbound processor and the simulator are built against these types.
// Pure data only: no I/O, no Node-only or Deno-only types.

export type Channel = "whatsapp" | "sms" | "web";
export type Language = "en" | "fr";
export type Role = "headteacher" | "teacher" | "partner" | "community";
export type SessionStatus = "active" | "completed" | "abandoned";
export type MediaType = "photo" | "audio";

/** What the engine knows about the person messaging. Never includes the raw phone number. */
export interface ReporterSnapshot {
  id: string;
  channel: Channel;
  language: Language | null;
  role: Role | null;
  consentAt: string | null;
  /** Name of the school from this reporter's latest report, if any. Weekly attendance goes to it. */
  lastSchoolName?: string | null;
}

/** A conversation session as persisted in the `sessions` table. `id` is null until first saved. */
export interface Session {
  id: string | null;
  flow: string;
  step: string;
  answers: Record<string, unknown>;
  status: SessionStatus;
  updatedAt: string;
}

/** Media already downloaded by the webhook and stored in the field-media bucket. */
export interface StoredMedia {
  type: MediaType;
  storagePath: string;
  contentType: string;
}

export interface InboundMessage {
  messageSid: string;
  channel: Channel;
  /** Trimmed message text. Empty string when the message is only media or a location. */
  text: string;
  media: StoredMedia[];
  /** WhatsApp location pin. Exact coordinates: only ever stored in restricted columns. */
  location: { lat: number; lng: number } | null;
  receivedAt: string;
  reporter: ReporterSnapshot;
}

export interface OutboundMessage {
  text: string;
}

export interface ReporterUpdate {
  language?: Language;
  role?: Role;
  consentAt?: string;
}

/** A completed school report, written by the webhook in one database call. */
export interface Submission {
  school: {
    name: string;
    regionCode: string;
    town: string;
    /** Exact pin if shared. Stored only in restricted columns. */
    lat: number | null;
    lng: number | null;
  };
  assessment: {
    enrollmentBand: string;
    buildingCondition: string;
    powerSource: string;
    connectivity: string;
    devices: string;
    topNeed: string;
    notes: string | null;
  };
  media: StoredMedia[];
}

/** Outbound text may contain this token; the webhook replaces it with the saved ref_code. */
export const REF_CODE_TOKEN = "{{ref_code}}";

export interface EngineResult {
  nextSession: Session;
  outboundMessages: OutboundMessage[];
  reporterUpdate?: ReporterUpdate;
  submission?: Submission;
  /** A weekly attendance count for the reporter's latest school. */
  attendance?: Attendance;
}

/** Aggregate counts only, never student-level data. */
export interface Attendance {
  present: number;
  enrolled: number;
}

export type Engine = (session: Session | null, inbound: InboundMessage) => EngineResult;
