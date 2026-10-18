// An inbound message after the channel (web chat or simulator) has parsed it.
// Runtime-agnostic (Node, Vitest, Deno).
import type { Channel } from "../engine/types.ts";

/** Media as the channel sent it (a data URL from the web chat). The URL is never stored. */
export interface ProviderMedia {
  url: string;
  contentType: string;
}

export interface ParsedInbound {
  messageSid: string;
  /** Sender in E.164, or the browser id for the web channel. */
  from: string;
  channel: Channel;
  text: string;
  media: ProviderMedia[];
  location: { lat: number; lng: number } | null;
}
