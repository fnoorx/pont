// Messaging provider interface. Twilio today; Meta Cloud API could replace it later
// by implementing the same shape. Runtime-agnostic (Node, Vitest, Deno).
import type { Channel } from "../engine/types.ts";

/** Media as the provider sent it. The URL needs provider auth and must never be stored. */
export interface ProviderMedia {
  url: string;
  contentType: string;
}

export interface ParsedInbound {
  messageSid: string;
  /** Sender in E.164, with any channel prefix (e.g. "whatsapp:") removed. */
  from: string;
  channel: Channel;
  text: string;
  media: ProviderMedia[];
  location: { lat: number; lng: number } | null;
}

export interface ProviderReply {
  body: string;
  contentType: string;
}

export interface MessagingProvider {
  /** Returns null when the payload is not an inbound message we can handle. */
  parseInbound(params: Record<string, string>): ParsedInbound | null;
  /** HTTP response body that sends these messages back to the sender (empty list sends nothing). */
  buildReply(messages: string[]): ProviderReply;
}
