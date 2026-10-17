// Twilio implementation of MessagingProvider (WhatsApp and SMS share one webhook).
import { z } from "zod";
import type { MessagingProvider, ParsedInbound, ProviderMedia } from "./types.ts";

const E164 = /^\+[1-9]\d{6,14}$/;
const MAX_MEDIA = 10;

const inboundSchema = z.object({
  MessageSid: z.string().regex(/^(SM|MM)[0-9a-fA-F]{32}$/),
  From: z.string().min(1),
  Body: z.string().optional().default(""),
  NumMedia: z.coerce.number().int().min(0).max(MAX_MEDIA).optional().default(0),
  Latitude: z.coerce.number().min(-90).max(90).optional(),
  Longitude: z.coerce.number().min(-180).max(180).optional(),
});

export function parseTwilioInbound(params: Record<string, string>): ParsedInbound | null {
  const parsed = inboundSchema.safeParse(params);
  if (!parsed.success) return null;
  const p = parsed.data;

  const isWhatsApp = p.From.startsWith("whatsapp:");
  const from = isWhatsApp ? p.From.slice("whatsapp:".length) : p.From;
  if (!E164.test(from)) return null;

  const media: ProviderMedia[] = [];
  for (let i = 0; i < p.NumMedia; i++) {
    const url = params[`MediaUrl${i}`];
    const contentType = params[`MediaContentType${i}`];
    if (url && contentType && url.startsWith("https://")) media.push({ url, contentType });
  }

  const location =
    p.Latitude !== undefined && p.Longitude !== undefined ? { lat: p.Latitude, lng: p.Longitude } : null;

  return {
    messageSid: p.MessageSid,
    from,
    channel: isWhatsApp ? "whatsapp" : "sms",
    text: p.Body.trim(),
    media,
    location,
  };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildTwiml(messages: string[]): string {
  const body = messages.map((m) => `<Message>${escapeXml(m)}</Message>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

export const twilioProvider: MessagingProvider = {
  parseInbound: parseTwilioInbound,
  buildReply: (messages) => ({ body: buildTwiml(messages), contentType: "text/xml; charset=utf-8" }),
};
