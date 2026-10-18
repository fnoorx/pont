import { beforeEach, describe, expect, it } from "vitest";
import { engine as assessmentEngine } from "../engine/index.ts";
import type { Engine } from "../engine/types.ts";
import type { ParsedInbound } from "../messaging/types.ts";
import { createInboundProcessor } from "./handler.ts";
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

  it("creates a hashed reporter, a session and an audit log", async () => {
    const replies = await processor()(inbound(SID1));
    expect(replies[0]).toContain("Choose your language");
    const [reporter] = [...store.reporters.values()];
    expect(reporter?.phoneHash).toMatch(/^[0-9a-f]{64}$/);
    expect(reporter?.phoneLast4).toBe("0001");
    expect(store.sessions.size).toBe(1);
    expect(store.messages.map((m) => m.direction)).toEqual(["inbound", "outbound"]);
  });

  it("ignores duplicate deliveries of the same message", async () => {
    await processor()(inbound(SID1));
    expect(await processor()(inbound(SID1))).toEqual([]);
    expect(store.messages).toHaveLength(2);
  });

  it("stores media in a pending path and skips unsupported types", async () => {
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
    expect(store.messages[0]?.body).toBe("[photo] [file]");
  });

  it("never writes location coordinates to the audit log", async () => {
    await processor()(inbound(SID1, { text: "", location: { lat: 5.96311, lng: 10.15912 } }));
    expect(store.messages[0]?.body).toBe("[location]");
    expect(JSON.stringify(store.messages)).not.toContain("5.963");
  });

  it("sends a friendly error instead of failing when something breaks", async () => {
    const broken: Engine = () => {
      throw new Error("boom");
    };
    const [reply] = await processor(broken)(inbound(SID1));
    expect(reply).toContain("Désolé");
    expect(reply).toContain("Sorry");
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
