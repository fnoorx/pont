import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { computeTwilioSignature, verifyTwilioSignature } from "./twilioSignature.ts";

const url = "https://example.supabase.co/functions/v1/twilio-webhook";
const params = { From: "whatsapp:+237690000001", Body: "Bonjour", MessageSid: "SM" + "a".repeat(32), NumMedia: "0" };

function reference(token: string, u: string, p: Record<string, string>): string {
  const data = u + Object.keys(p).sort().map((k) => k + p[k]).join("");
  return createHmac("sha1", token).update(data).digest("base64");
}

describe("Twilio signature", () => {
  it("matches an independent HMAC-SHA1 implementation", async () => {
    await expect(computeTwilioSignature("secret", url, params)).resolves.toBe(reference("secret", url, params));
  });

  it("accepts a valid signature", async () => {
    await expect(verifyTwilioSignature("secret", url, params, reference("secret", url, params))).resolves.toBe(true);
  });

  it("rejects a wrong token, URL, tampered params or missing signature", async () => {
    const good = reference("secret", url, params);
    await expect(verifyTwilioSignature("other", url, params, good)).resolves.toBe(false);
    await expect(verifyTwilioSignature("secret", url + "x", params, good)).resolves.toBe(false);
    await expect(verifyTwilioSignature("secret", url, { ...params, Body: "Hello" }, good)).resolves.toBe(false);
    await expect(verifyTwilioSignature("secret", url, params, null)).resolves.toBe(false);
  });
});
