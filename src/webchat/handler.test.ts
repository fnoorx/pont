import { describe, expect, it } from "vitest";
import { engine } from "../engine/index.ts";
import { createInboundProcessor, ProcessingError } from "../webhook/handler.ts";
import { MemoryStore } from "../webhook/memoryStore.ts";
import { createWebChatHandler, type WebChatRequest } from "./handler.ts";

const clientId = "3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b";
let n = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

function setup() {
  const store = new MemoryStore();
  const processInbound = createInboundProcessor({ store, engine, phoneHashSalt: "salt", log: () => {} });
  const handler = createWebChatHandler({ processInbound });
  const send = async (body: Partial<WebChatRequest>) => {
    const res = await handler(
      new Request("http://local/web-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, messageId: nextId(), ...body }),
      }),
    );
    return { status: res.status, body: (await res.json()) as { replies?: string[]; error?: string }, headers: res.headers };
  };
  return { store, handler, send };
}

describe("web chat handler", () => {
  it("answers CORS preflight", async () => {
    const { handler } = setup();
    const res = await handler(new Request("http://local/web-chat", { method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("runs the real engine and creates a web reporter with no phone number", async () => {
    const { store, send } = setup();
    const first = await send({ text: "hi" });
    expect(first.status).toBe(200);
    expect(first.body.replies?.[0]).toContain("Choose your language");
    const [reporter] = [...store.reporters.values()];
    expect(reporter?.channel).toBe("web");
    expect(reporter?.phoneE164).toBeNull();
    expect(reporter?.phoneLast4).toBeNull();
    expect(reporter?.phoneHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("completes a report with a photo and location, and returns the ref code", async () => {
    const { store, send } = setup();
    const png = "data:image/png;base64,iVBORw0KGgo=";
    for (const text of ["hi", "1", "1", "1", "Web Test School", "2", "Obala", "2", "2", "3", "2", "1", "5"]) await send({ text });
    await send({ image: { dataUrl: png } });
    await send({ location: { lat: 4.17, lng: 11.53 } });
    await send({ text: "0" });
    const done = await send({ text: "1" });
    expect(done.body.replies?.[0]).toContain("PS-T001");
    expect(store.uploads[0]?.contentType).toBe("image/png");
    expect(store.submissions[0]?.submission.school).toMatchObject({ name: "Web Test School", lat: 4.17, lng: 11.53 });
    expect(store.submissions[0]?.submission.media).toHaveLength(1);
  });

  it("rejects bad input", async () => {
    const { send } = setup();
    expect((await send({ clientId: "not-a-uuid" } as Partial<WebChatRequest>)).status).toBe(400);
    expect((await send({ image: { dataUrl: "data:text/html;base64,PGgxPg==" } })).status).toBe(400);
  });

  it("never answers 200 without replies: 503 while still processing, 500 when it failed", async () => {
    const answer = async (err: Error) => {
      const handler = createWebChatHandler({ processInbound: async () => { throw err; } });
      const res = await handler(
        new Request("http://local/web-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, messageId: nextId(), text: "hi" }),
        }),
      );
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      return res.status;
    };
    expect(await answer(new ProcessingError("still processing", [], true))).toBe(503);
    expect(await answer(new ProcessingError("db down", ["Sorry"]))).toBe(500);
  });

  it("answers an unexpected error as JSON with CORS headers, so the browser does not mistake it for no signal", async () => {
    const handler = createWebChatHandler({ processInbound: async () => { throw new Error("db down"); } });
    const res = await handler(
      new Request("http://local/web-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, messageId: nextId(), text: "hi" }),
      }),
    );
    expect(res.status).toBe(500);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
