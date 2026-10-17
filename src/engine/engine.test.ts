import { describe, expect, it } from "vitest";
import { assessmentEngine, RESUME_GAP_MS, SESSION_EXPIRY_MS } from "./engine.ts";
import { FLOW } from "./flow.ts";
import { STRINGS } from "./strings.ts";
import {
  REF_CODE_TOKEN,
  type Channel,
  type EngineResult,
  type InboundMessage,
  type ReporterSnapshot,
  type Session,
  type StoredMedia,
} from "./types.ts";

/** Drives the engine like the webhook does: keeps session and reporter between turns. */
class Chat {
  session: Session | null = null;
  reporter: ReporterSnapshot;
  clock = Date.parse("2026-10-17T12:00:00.000Z");
  last: EngineResult | null = null;
  private n = 0;

  constructor(channel: Channel = "whatsapp", reporter: Partial<ReporterSnapshot> = {}) {
    this.reporter = { id: "r1", channel, language: null, role: null, consentAt: null, ...reporter };
  }

  send(text: string, extra: Partial<InboundMessage> = {}, advanceMs = 5_000): string {
    this.clock += advanceMs;
    const inbound: InboundMessage = {
      messageSid: `SM${++this.n}`,
      channel: this.reporter.channel,
      text,
      media: [],
      location: null,
      receivedAt: new Date(this.clock).toISOString(),
      reporter: this.reporter,
      ...extra,
    };
    const result = assessmentEngine(this.session, inbound);
    this.last = result;
    const saved = result.nextSession;
    this.session = { ...saved, id: saved.id ?? "s1" };
    if (result.reporterUpdate) {
      const u = result.reporterUpdate;
      this.reporter = {
        ...this.reporter,
        ...(u.language ? { language: u.language } : {}),
        ...(u.role ? { role: u.role } : {}),
        ...(u.consentAt ? { consentAt: u.consentAt } : {}),
      };
    }
    if (saved.status !== "active") this.session = { ...this.session, status: saved.status };
    expect(result.outboundMessages).toHaveLength(1);
    return result.outboundMessages[0]!.text;
  }

  get step(): string {
    return this.session?.step ?? "";
  }
}

const photo: StoredMedia = { type: "photo", storagePath: "pending/r1/SM1-0.jpg", contentType: "image/jpeg" };
const voice: StoredMedia = { type: "audio", storagePath: "pending/r1/SM2-0.ogg", contentType: "audio/ogg" };

/** Answers up to (and including) the biggest-need question. */
function answerCoreQuestions(chat: Chat): void {
  chat.send("1"); // role: headteacher
  chat.send("Ecole Publique de Test");
  chat.send("7"); // region: NW
  chat.send("Bamenda");
  chat.send("2"); // 100-300
  chat.send("3"); // unsafe
  chat.send("5"); // no power
  chat.send("2"); // weak signal
  chat.send("1"); // no devices
  chat.send("1"); // building repairs
}

describe("assessment engine: happy path", () => {
  it("walks the full WhatsApp flow in English and produces a submission", () => {
    const chat = new Chat();
    const first = chat.send("hi");
    expect(first).toContain("Choose your language");
    expect(first).toContain("1. English");
    expect(chat.step).toBe("language");

    expect(chat.send("1")).toContain("Do you agree");
    expect(chat.send("yes")).toContain("What is your role?");
    expect(chat.reporter.consentAt).not.toBeNull();
    expect(chat.reporter.language).toBe("en");

    answerCoreQuestions(chat);
    expect(chat.step).toBe("photo");
    expect(chat.send("", { media: [photo] })).toContain("share your location");
    expect(chat.send("", { location: { lat: 5.9631, lng: 10.1591 } })).toContain("Anything else");
    const summary = chat.send("Roof leaks in two classrooms");
    expect(summary).toContain("Please check your report");
    expect(summary).toContain("Ecole Publique de Test");
    expect(summary).toContain("Northwest");
    expect(summary).toContain("Unsafe or no roof");
    expect(summary).toContain("1. Submit");

    const thanks = chat.send("1");
    expect(thanks).toContain(REF_CODE_TOKEN);
    expect(chat.session?.status).toBe("completed");
    expect(chat.reporter.role).toBe("headteacher");
    expect(chat.last?.submission).toEqual({
      school: { name: "Ecole Publique de Test", regionCode: "NW", town: "Bamenda", lat: 5.9631, lng: 10.1591 },
      assessment: {
        enrollmentBand: "100_300",
        buildingCondition: "unsafe",
        powerSource: "none",
        connectivity: "weak",
        devices: "none",
        topNeed: "building",
        notes: "Roof leaks in two classrooms",
      },
      media: [photo],
    });
  });

  it("works in French with word answers", () => {
    const chat = new Chat();
    chat.send("bonjour");
    expect(chat.send("français")).toContain("Êtes-vous d'accord");
    expect(chat.send("oui")).toContain("Quel est votre rôle");
    expect(chat.send("deux")).toContain("nom de l'école"); // teacher
    chat.send("École du Village");
    expect(chat.send("Extrême-Nord")).toContain("ville ou quel village");
    expect(chat.session?.answers.region).toBe("EN");
  });

  it("skips photo and location on SMS and accepts a voice note", () => {
    const chat = new Chat("sms");
    chat.send("hi");
    chat.send("2");
    chat.send("1");
    answerCoreQuestions(chat);
    expect(chat.step).toBe("notes");
    chat.send("", { media: [voice] });
    expect(chat.step).toBe("confirm");
    chat.send("1");
    expect(chat.last?.submission?.media).toEqual([voice]);
    expect(chat.last?.submission?.school.lat).toBeNull();
    expect(chat.last?.submission?.assessment.notes).toBeNull();
  });

  it("lets every optional step be skipped with 0", () => {
    const chat = new Chat();
    chat.send("hi");
    chat.send("1");
    chat.send("1");
    answerCoreQuestions(chat);
    chat.send("0");
    chat.send("skip");
    const summary = chat.send("passer");
    expect(summary).toContain("Photo: no. Location: no. Note: no.");
    chat.send("1");
    expect(chat.last?.submission?.media).toEqual([]);
  });

  it("starts returning reporters straight at the role question", () => {
    const chat = new Chat("whatsapp", { language: "fr", consentAt: "2026-10-01T00:00:00.000Z" });
    const first = chat.send("salut");
    expect(first).toContain("Bon retour sur Pont");
    expect(first).toContain("Quel est votre rôle");
  });
});

describe("assessment engine: consent and invalid input", () => {
  it("collects nothing and ends politely when consent is declined", () => {
    const chat = new Chat();
    chat.send("hi");
    chat.send("1");
    expect(chat.send("2")).toContain("We have not saved any answers");
    expect(chat.session?.status).toBe("abandoned");
    expect(chat.session?.answers).toEqual({});
    expect(chat.reporter.consentAt).toBeNull();
    expect(chat.reporter.language).toBeNull();
  });

  it("re-asks the same question with a hint on invalid input", () => {
    const chat = new Chat();
    chat.send("hi");
    chat.send("1");
    chat.send("1");
    const reply = chat.send("purple");
    expect(reply).toContain("Please reply with a number from 1 to 4.");
    expect(reply).toContain("What is your role?");
    expect(chat.step).toBe("role");
    expect(chat.send("9")).toContain("1 to 4");
  });

  it("rejects too-short free text", () => {
    const chat = new Chat();
    chat.send("hi");
    chat.send("1");
    chat.send("1");
    chat.send("1");
    expect(chat.send("x")).toContain("2 to 120 letters");
    expect(chat.step).toBe("school_name");
  });

  it("asks again when no photo arrives at the photo step", () => {
    const chat = new Chat();
    chat.send("hi");
    chat.send("1");
    chat.send("1");
    answerCoreQuestions(chat);
    expect(chat.send("here")).toContain("I did not get a photo");
    expect(chat.step).toBe("photo");
  });
});

describe("assessment engine: global commands", () => {
  function midReport(): Chat {
    const chat = new Chat();
    chat.send("hi");
    chat.send("1");
    chat.send("1");
    chat.send("1"); // role
    chat.send("Hill School"); // name
    return chat; // now at region
  }

  it("BACK returns to the previous question", () => {
    const chat = midReport();
    expect(chat.step).toBe("region");
    expect(chat.send("BACK")).toContain("name of the school");
    expect(chat.send("retour")).toContain("What is your role?");
    expect(chat.send("back")).toContain("This is the first question.");
  });

  it("RESTART clears answers but keeps the language", () => {
    const chat = midReport();
    const reply = chat.send("RESTART");
    expect(reply).toContain("starting a new report");
    expect(chat.step).toBe("role");
    expect(chat.session?.answers.school_name).toBeUndefined();
    expect(chat.session?.answers.language).toBe("en");
  });

  it("HELP explains commands and repeats the question", () => {
    const chat = midReport();
    const reply = chat.send("aide");
    expect(reply).toContain("BACK");
    expect(reply).toContain("Which region");
    expect(chat.step).toBe("region");
  });

  it("MENU can continue, restart or change language", () => {
    const chat = midReport();
    expect(chat.send("MENU")).toContain("1. Continue my report");
    expect(chat.send("1")).toContain("Which region");

    chat.send("menu");
    chat.send("3");
    expect(chat.step).toBe("language");
    expect(chat.send("2")).toContain("Dans quelle région");
    expect(chat.reporter.language).toBe("fr");
    expect(chat.step).toBe("region");
  });
});

describe("assessment engine: resuming and expiry", () => {
  it("offers to continue or start over after a gap", () => {
    const chat = new Chat();
    chat.send("hi");
    chat.send("1");
    chat.send("1");
    chat.send("1");
    chat.send("Hill School");
    const reply = chat.send("hello again", {}, RESUME_GAP_MS + 1_000);
    expect(reply).toContain("report in progress for Hill School");
    expect(chat.send("1")).toContain("Which region");
  });

  it("starts over when the reporter chooses 2 after a gap", () => {
    const chat = new Chat();
    chat.send("hi");
    chat.send("1");
    chat.send("1");
    chat.send("1");
    chat.send("hi", {}, RESUME_GAP_MS + 1_000);
    expect(chat.send("2")).toContain("starting a new report");
  });

  it("expires sessions after 72 hours and reuses the row", () => {
    const chat = new Chat();
    chat.send("hi");
    chat.send("1");
    chat.send("1");
    chat.send("1");
    const reply = chat.send("hello", {}, SESSION_EXPIRY_MS + 1_000);
    expect(reply).toContain("Welcome back to Pont");
    expect(chat.step).toBe("role");
    expect(chat.session?.id).toBe("s1");
  });

  it("starts a fresh report after a completed one", () => {
    const chat = new Chat("sms");
    chat.send("hi");
    chat.send("1");
    chat.send("1");
    answerCoreQuestions(chat);
    chat.send("0");
    chat.send("1");
    expect(chat.session?.status).toBe("completed");
    const reply = chat.send("another one");
    expect(reply).toContain("What is your role?");
    expect(chat.session?.status).toBe("active");
  });
});

describe("assessment engine: copy limits", () => {
  it("keeps every question under 600 characters in both languages", () => {
    for (const lang of ["en", "fr"] as const) {
      const chat = new Chat("whatsapp", { language: lang, consentAt: "2026-10-01T00:00:00.000Z" });
      chat.send("hi");
      for (const step of FLOW) {
        if (step.kind === "choice") {
          const rendered = `${step.prompt[lang]}\n${step.options.map((o, i) => `${i + 1}. ${o.label[lang]}`).join("\n")}`;
          expect(rendered.length, `${step.id} ${lang}`).toBeLessThanOrEqual(600);
        } else {
          expect(step.prompt[lang].length, `${step.id} ${lang}`).toBeLessThanOrEqual(600);
        }
      }
    }
  });

  it("has every string in both languages", () => {
    for (const [key, value] of Object.entries(STRINGS)) {
      expect(value.en, key).toBeTruthy();
      expect(value.fr, key).toBeTruthy();
    }
  });

  it("keeps the summary under 600 characters with a long school name", () => {
    const chat = new Chat("sms", { language: "fr", consentAt: "2026-10-01T00:00:00.000Z" });
    chat.send("hi");
    chat.send("1");
    chat.send("É".repeat(120));
    chat.send("9");
    chat.send("V".repeat(120));
    for (const n of ["4", "3", "5", "3", "3", "7"]) chat.send(n);
    const summary = chat.send("0");
    expect(chat.step).toBe("confirm");
    expect(summary.length).toBeLessThanOrEqual(600);
  });
});
