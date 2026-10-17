import { describe, expect, it } from "vitest";
import { assessmentEngine } from "../engine/engine.ts";
import type { InboundMessage, Language, ReporterSnapshot, Session } from "../engine/types.ts";
import { smsSegments, toGsm7 } from "./sms.ts";

describe("toGsm7", () => {
  it("keeps GSM-7 accents and strips the others", () => {
    expect(toGsm7("École élève à")).toBe("École élève à");
    expect(toGsm7("Êtes-vous d'accord ? Français, rôle")).toBe("Etes-vous d'accord ? Francais, role");
    expect(toGsm7("cœur « oui » …")).toBe('coeur " oui " ...');
  });
});

describe("smsSegments", () => {
  it("counts GSM-7 and UCS-2 segments", () => {
    expect(smsSegments("a".repeat(160))).toBe(1);
    expect(smsSegments("a".repeat(161))).toBe(2);
    expect(smsSegments("ê".repeat(70))).toBe(1);
    expect(smsSegments("ê".repeat(71))).toBe(2);
  });
});

/** Every message an SMS user can receive, after transliteration. */
function smsTranscript(lang: Language): string[] {
  const answers = ["hi", lang === "en" ? "1" : "2", "1", "1", "É".repeat(40), "9", "V".repeat(30), "4", "3", "5", "3", "3", "7", "0", "1"];
  let session: Session | null = null;
  let reporter: ReporterSnapshot = { id: "r1", channel: "sms", language: null, role: null, consentAt: null };
  const out: string[] = [];
  let clock = Date.parse("2026-10-17T12:00:00Z");
  for (const [i, text] of answers.entries()) {
    clock += 5000;
    const inbound: InboundMessage = { messageSid: `SM${i}`, channel: "sms", text, media: [], location: null, receivedAt: new Date(clock).toISOString(), reporter };
    const r = assessmentEngine(session, inbound);
    session = { ...r.nextSession, id: "s1" };
    if (r.reporterUpdate) reporter = { ...reporter, ...r.reporterUpdate, consentAt: r.reporterUpdate.consentAt ?? reporter.consentAt };
    out.push(...r.outboundMessages.map((m) => toGsm7(m.text.replace("{{ref_code}}", "PS-AB12"))));
  }
  return out;
}

describe("SMS flow", () => {
  for (const lang of ["en", "fr"] as const) {
    it(`fits GSM-7, with questions in 2 segments and the summary in 3 (${lang})`, () => {
      const messages = smsTranscript(lang);
      expect(messages.length).toBeGreaterThan(10);
      for (const m of messages) {
        const isSummary = m.includes("1. Submit") || m.includes("1. Envoyer");
        expect(smsSegments(m), m).toBeLessThanOrEqual(isSummary ? 3 : 2);
        expect([...m].some((ch) => toGsm7(ch) !== ch), m).toBe(false);
      }
    });
  }
});
