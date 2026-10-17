import { describe, expect, it } from "vitest";
import { placeholderEngine } from "./placeholder.ts";
import type { InboundMessage } from "./types.ts";

const inbound = (over: Partial<InboundMessage> = {}): InboundMessage => ({
  messageSid: "SM1",
  channel: "whatsapp",
  text: "hi",
  media: [],
  location: null,
  receivedAt: "2026-10-17T12:00:00.000Z",
  reporter: { id: "r1", channel: "whatsapp", language: null, role: null, consentAt: null },
  ...over,
});

describe("placeholderEngine", () => {
  it("replies bilingually when the language is unknown and starts a session", () => {
    const r = placeholderEngine(null, inbound());
    expect(r.outboundMessages).toHaveLength(1);
    expect(r.outboundMessages[0]!.text).toContain("Bonjour");
    expect(r.outboundMessages[0]!.text).toContain("Hello");
    expect(r.nextSession).toMatchObject({ id: null, status: "active", answers: { message_count: 1 } });
  });

  it("uses the reporter's language and keeps counting", () => {
    const first = placeholderEngine(null, inbound());
    const r = placeholderEngine(
      { ...first.nextSession, id: "s1" },
      inbound({ reporter: { id: "r1", channel: "whatsapp", language: "en", role: null, consentAt: null } }),
    );
    expect(r.outboundMessages[0]!.text).not.toContain("Bonjour");
    expect(r.nextSession).toMatchObject({ id: "s1", answers: { message_count: 2 } });
  });

  it("acknowledges media and location", () => {
    const r = placeholderEngine(
      null,
      inbound({ media: [{ type: "photo", storagePath: "p", contentType: "image/jpeg" }], location: { lat: 1, lng: 2 } }),
    );
    expect(r.outboundMessages).toHaveLength(3);
  });
});
