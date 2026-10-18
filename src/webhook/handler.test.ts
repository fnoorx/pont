import { beforeEach, describe, expect, it } from "vitest";
import { engine as assessmentEngine } from "../engine/index.ts";
import type { Engine } from "../engine/types.ts";
import type { ParsedInbound } from "../messaging/types.ts";
import { createInboundProcessor, ProcessingError } from "./handler.ts";
import { MemoryStore } from "./memoryStore.ts";

const SID1 = "SM" + "1".repeat(32);
const SID2 = "SM" + "2".repeat(32);
const inbound = (messageSid: string, extra: Partial<ParsedInbound> = {}): ParsedInbound => ({
  messageSid,
  from: "+237690000001",
  channel: "whatsapp",
  text: "Bonjour",
  media: [],
  location: null,
  ...extra,
});

describe("inbound processor", () => {
  let store: MemoryStore;
  const fakeFetch: typeof fetch = async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 });
  const processor = (engine: Engine = assessmentEngine) =>
    createInboundProcessor({ store, engine, phoneHashSalt: "salt", fetchImpl: fakeFetch, log: () => {} });

  beforeEach(() => {
    store = new MemoryStore();
  });

  /** Language and consent, as every reporter does first. Message ids C1..C3. */
  const consent = async () => {
    for (const [i, text] of ["hi", "1", "1"].entries()) await processor()(inbound(`SM${"c".repeat(31)}${i}`, { text }));
  };

  it("creates a hashed reporter and a session, and logs nothing before consent", async () => {
    const replies = await processor()(inbound(SID1));
    expect(replies[0]).toContain("Choose your language");
    const [reporter] = [...store.reporters.values()];
    expect(reporter?.phoneHash).toMatch(/^[0-9a-f]{64}$/);
    expect(reporter?.phoneLast4).toBe("0001");
    expect(store.sessions.size).toBe(1);
    expect(store.messages).toEqual([]);
  });

  it("starts the message log with the consent message", async () => {
    await consent();
    expect(store.messages[0]).toMatchObject({ direction: "inbound", body: "1" });
    expect(store.messages.some((m) => m.body === "hi")).toBe(false);
  });

  it("stores nothing when consent is declined, and never uploads a photo sent before consent", async () => {
    const photo = { url: "data:image/jpeg;base64,AAAA", contentType: "image/jpeg" };
    await processor()(inbound(SID1, { text: "", media: [photo] }));
    await processor()(inbound(SID2, { text: "1" }));
    await processor()(inbound("SM" + "3".repeat(32), { text: "2" }));
    expect(store.uploads).toEqual([]);
    expect(store.messages).toEqual([]);
  });

  it("sends the same replies again when a message is retried after a lost response", async () => {
    const first = await processor()(inbound(SID1));
    const retry = await processor()(inbound(SID1));
    expect(retry).toEqual(first);
    expect(retry[0]).toContain("Choose your language");
    expect(store.sessions.size).toBe(1);
  });

  it("processes a retry again when the first attempt failed", async () => {
    const broken: Engine = () => {
      throw new Error("boom");
    };
    await expect(processor(broken)(inbound(SID1))).rejects.toBeInstanceOf(ProcessingError);
    const retry = await processor()(inbound(SID1));
    expect(retry[0]).toContain("Choose your language");
  });

  it("stores media in a pending path and skips unsupported types", async () => {
    await consent();
    await processor()(
      inbound(SID2, {
        text: "",
        media: [
          { url: "data:image/jpeg;base64,AAAA", contentType: "image/jpeg" },
          { url: "data:video/mp4;base64,AAAA", contentType: "video/mp4" },
        ],
      }),
    );
    expect(store.uploads).toEqual([{ path: `pending/r1/${SID2}-0.jpg`, size: 3, contentType: "image/jpeg" }]);
    expect(store.messages.at(-2)?.body).toBe("[photo] [file]");
  });

  it("never writes location coordinates to the audit log", async () => {
    await consent();
    await processor()(inbound(SID1, { text: "", location: { lat: 5.96311, lng: 10.15912 } }));
    expect(store.messages.at(-2)?.body).toBe("[location]");
    expect(JSON.stringify(store.messages)).not.toContain("5.963");
  });

  it("reports a failure with a friendly apology for text-only channels", async () => {
    const broken: Engine = () => {
      throw new Error("boom");
    };
    const err = await processor(broken)(inbound(SID1)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProcessingError);
    const [reply] = (err as ProcessingError).replies;
    expect(reply).toContain("Désolé");
    expect(reply).toContain("Sorry");
  });

  it("asks for a retry, not an empty answer, while the first attempt is still running", async () => {
    await store.markProcessed(SID1); // the first attempt has started but not saved its replies yet
    const err = await processor()(inbound(SID1)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProcessingError);
    expect((err as ProcessingError).retryable).toBe(true);
  });

  it("processes a message again when its first attempt died without replies", async () => {
    await store.markProcessed(SID1);
    store.processedAt.set(SID1, Date.now() - 120_000);
    const replies = await processor()(inbound(SID1));
    expect(replies[0]).toContain("Choose your language");
  });

  it("does not save a report twice when a later step fails", async () => {
    await consent();
    for (const [i, text] of ["1", "Test School", "2", "Obala", "2", "2", "3", "2", "1", "5", "0", "0", "0"].entries()) {
      await processor()(inbound(`SM${"r".repeat(30)}${String(i).padStart(2, "0")}`, { text }));
    }
    store.logMessages = async () => {
      throw new Error("log down");
    };
    const replies = await processor()(inbound(SID1, { text: "1" }));
    expect(replies[0]).toContain("PS-T001");
    expect(await processor()(inbound(SID1, { text: "1" }))).toEqual(replies);
    expect(store.submissions).toHaveLength(1);
  });
});

describe("partner milestone updates through the processor", () => {
  it("looks up the project and stores the milestone photo path", async () => {
    const store = new MemoryStore();
    store.projects.set("PJ-104", { title: "Offline learning kit", school: "Palm Grove", milestones: [{ title: "Delivered", done: true }, { title: "Teachers trained", done: false }] });
    const fakeFetch: typeof fetch = async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    const process = createInboundProcessor({ store, engine: assessmentEngine, phoneHashSalt: "salt", fetchImpl: fakeFetch, log: () => {} });
    const send = (sid: string, extra: Partial<ParsedInbound>) => process(inbound(sid, extra));

    // Consent first, as every reporter does.
    await send("SM" + "a".repeat(32), { text: "hi" });
    await send("SM" + "b".repeat(32), { text: "1" });
    await send("SM" + "c".repeat(32), { text: "1" });
    const [ask] = await send("SM" + "d".repeat(32), { text: "DONE PJ-104" });
    expect(ask).toContain("Next milestone: Teachers trained");
    const [thanks] = await send("MM" + "e".repeat(32), { text: "", media: [{ url: "data:image/jpeg;base64,AAAA", contentType: "image/jpeg" }] });
    expect(thanks).toContain("(2 of 2)");
    const trained = store.projects.get("PJ-104")!.milestones[1]!;
    expect(trained.done).toBe(true);
    expect(trained.photoPath).toMatch(/^pending\/r1\/MM.+-0\.jpg$/);
  });
});
