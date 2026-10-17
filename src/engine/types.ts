// The engine contract. The webhook (and later the simulator) is built against these types,
// so the placeholder engine can be swapped for the real one without touching the handler.
// Pure data only: no I/O, no Node-only or Deno-only types.

export type Channel = "whatsapp" | "sms";
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

export interface EngineResult {
  nextSession: Session;
  outboundMessages: OutboundMessage[];
  reporterUpdate?: ReporterUpdate;
}

export type Engine = (session: Session | null, inbound: InboundMessage) => EngineResult;
