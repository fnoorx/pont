import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { placeholderEngine } from "../engine/placeholder.ts";
import type { Engine } from "../engine/types.ts";
import { twilioProvider } from "../messaging/twilio.ts";
import { createWebhookHandler, type WebhookConfig } from "./handler.ts";
import { MemoryStore } from "./memoryStore.ts";

const config: WebhookConfig = {
  twilioAccountSid: "AC" + "0".repeat(32),
  twilioAuthToken: "test-token",
  publicUrl: "https://example.supabase.co/functions/v1/twilio-webhook",
  phoneHashSalt: "salt",
};

function sign(params: Record<string, string>, url = config.publicUrl, token = config.twilioAuthToken): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  return createHmac("sha1", token).update(data).digest("base64");
}

function request(params: Record<string, string>, signature: string | null = sign(params)): Request {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (signature) headers["X-Twilio-Signature"] = signature;
  return new Request("http://internal/twilio-webhook", { method: "POST", headers, body: new URLSearchParams(params).toString() });
}

const SID1 = "SM" + "1".repeat(32);
const SID2 = "SM" + "2".repeat(32);
const text = (sid: string, body = "Bonjour", from = "whatsapp:+237690000001") => ({ MessageSid: sid, From: from, Body: body, NumMedia: "0" });

describe("webhook handler", () => {
  let store: MemoryStore;
  let fetched: { url: string; auth: string | null }[];
  const fakeFetch: typeof fetch = async (input, init) => {
    fetched.push({ url: String(input), auth: new Headers(init?.headers).get("Authorization") });
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
  };
  const handler = (engine: Engine = placeholderEngine) =>
    createWebhookHandler({ config, store, engine, provider: twilioProvider, fetchImpl: fakeFetch, log: () => {} });

  beforeEach(() => {
    store = new MemoryStore();
    fetched = [];
  });

  it("rejects requests with a missing or bad signature", async () => {
    expect((await handler()(request(text(SID1), null))).status).toBe(403);
    expect((await handler()(request(text(SID1), sign(text(SID1), config.publicUrl, "wrong")))).status).toBe(403);
    expect(store.processed.size).toBe(0);
  });

  it("rejects non-POST requests", async () => {
    expect((await handler()(new Request("http://internal/", { method: "GET" }))).status).toBe(405);
  });

  it("replies with TwiML, creates a hashed reporter, session and audit log", async () => {
    const res = await handler()(request(text(SID1)));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/xml");
    const body = await res.text();
    expect(body).toContain("<Message>");
    expect(body).toContain("Bonjour !");

    const [reporter] = [...store.reporters.values()];
    expect(reporter?.phoneHash).toMatch(/^[0-9a-f]{64}$/);
    expect(reporter?.phoneLast4).toBe("0001");
    expect(reporter?.channel).toBe("whatsapp");
    expect(store.sessions.size).toBe(1);
    expect(store.messages.map((m) => m.direction)).toEqual(["inbound", "outbound"]);
    expect(store.messages[0]?.body).toBe("Bonjour");
  });

  it("ignores duplicate deliveries of the same message", async () => {
    await handler()(request(text(SID1)));
    const res = await handler()(request(text(SID1)));
    expect(await res.text()).not.toContain("<Message>");
    expect(store.messages).toHaveLength(2);
  });

  it("resumes the same session on the next message", async () => {
    await handler()(request(text(SID1)));
    await handler()(request(text(SID2, "2")));
    expect(store.sessions.size).toBe(1);
    expect([...store.sessions.values()][0]?.answers).toEqual({ message_count: 2 });
  });

  it("downloads media with Twilio auth into a pending path, never storing the Twilio URL", async () => {
    const params = {
      MessageSid: "MM" + "3".repeat(32),
      From: "whatsapp:+237690000001",
      Body: "",
      NumMedia: "2",
      MediaUrl0: "https://api.twilio.com/media/ME1",
      MediaContentType0: "image/jpeg",
      MediaUrl1: "https://api.twilio.com/media/ME2",
      MediaContentType1: "video/mp4",
    };
    await handler()(request(params));
    expect(fetched).toHaveLength(1);
    expect(fetched[0]?.auth).toMatch(/^Basic /);
    expect(store.uploads).toEqual([{ path: `pending/r1/${params.MessageSid}-0.jpg`, size: 3, contentType: "image/jpeg" }]);
    expect(JSON.stringify([...store.sessions.values()])).not.toContain("twilio.com");
    expect(store.messages[0]?.body).toBe("[photo] [file]");
  });

  it("never writes location coordinates to the audit log", async () => {
    const params = { ...text(SID1, ""), Latitude: "5.96311", Longitude: "10.15912" };
    await handler()(request(params));
    expect(store.messages[0]?.body).toBe("[location]");
    expect(JSON.stringify(store.messages)).not.toContain("5.963");
  });

  it("replies 200 with an empty response to non-message payloads", async () => {
    const params = { MessageStatus: "delivered", SmsSid: SID1 };
    const res = await handler()(request(params));
    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain("<Message>");
  });

  it("sends a friendly error instead of failing when something breaks", async () => {
    const broken: Engine = () => {
      throw new Error("boom");
    };
    const res = await handler(broken)(request(text(SID1)));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Désolé");
    expect(body).toContain("Sorry");
  });
});
