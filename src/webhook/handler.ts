// The thin webhook handler (AGENTS.md section 9), written against web-standard
// Request/Response so it runs in the Edge Function (Deno) and in Vitest (Node).
// Order: verify signature, idempotency, reporter, session, media, engine, persist, reply.
import { bilingual, t } from "../engine/strings.ts";
import type { Engine, Language, MediaType, ReporterSnapshot, Session, StoredMedia } from "../engine/types.ts";
import { hashPhone, last4 } from "../lib/privacy.ts";
import { verifyTwilioSignature } from "../messaging/twilioSignature.ts";
import type { MessagingProvider, ParsedInbound, ProviderMedia } from "../messaging/types.ts";
import type { MessageLogRow, Store } from "./store.ts";

const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
};

export interface WebhookConfig {
  twilioAccountSid: string;
  twilioAuthToken: string;
  /** The exact public URL Twilio calls. Signatures are computed over it. */
  publicUrl: string;
  phoneHashSalt: string;
}

export interface WebhookDeps {
  config: WebhookConfig;
  store: Store;
  engine: Engine;
  provider: MessagingProvider;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  log?: (message: string, extra?: Record<string, unknown>) => void;
}

function mediaType(contentType: string): MediaType | null {
  const base = contentType.split(";")[0]!.trim().toLowerCase();
  if (base.startsWith("image/")) return "photo";
  if (base.startsWith("audio/")) return "audio";
  return null;
}

/** Audit log text for an inbound message. Never logs coordinates. */
function inboundLogBody(parsed: ParsedInbound): string {
  const parts: string[] = [];
  if (parsed.text) parts.push(parsed.text);
  for (const m of parsed.media) parts.push(`[${mediaType(m.contentType) ?? "file"}]`);
  if (parsed.location) parts.push("[location]");
  return parts.join(" ") || "[empty]";
}

export function createWebhookHandler(deps: WebhookDeps): (req: Request) => Promise<Response> {
  const { config, store, engine, provider } = deps;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? ((message, extra) => console.log(JSON.stringify({ message, ...extra })));

  const reply = (messages: string[], status = 200): Response => {
    const { body, contentType } = provider.buildReply(messages);
    return new Response(body, { status, headers: { "Content-Type": contentType } });
  };

  async function downloadMedia(reporterId: string, messageSid: string, media: ProviderMedia[]): Promise<StoredMedia[]> {
    const stored: StoredMedia[] = [];
    const auth = `Basic ${btoa(`${config.twilioAccountSid}:${config.twilioAuthToken}`)}`;
    for (const [i, m] of media.entries()) {
      const type = mediaType(m.contentType);
      const baseType = m.contentType.split(";")[0]!.trim().toLowerCase();
      const ext = EXTENSIONS[baseType];
      if (!type || !ext) {
        log("media skipped: unsupported type", { messageSid, contentType: baseType });
        continue;
      }
      const res = await fetchImpl(m.url, { headers: { Authorization: auth } });
      if (!res.ok) throw new Error(`media download failed: HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_MEDIA_BYTES) {
        log("media skipped: too large", { messageSid, bytes: bytes.byteLength });
        continue;
      }
      // Pending until linked to an assessment on submit. Twilio URLs are never stored.
      const storagePath = `pending/${reporterId}/${messageSid}-${i}.${ext}`;
      await store.uploadMedia(storagePath, bytes, baseType);
      stored.push({ type, storagePath, contentType: baseType });
    }
    return stored;
  }

  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const params = Object.fromEntries(new URLSearchParams(await req.text()));
    const signature = req.headers.get("X-Twilio-Signature");
    if (!(await verifyTwilioSignature(config.twilioAuthToken, config.publicUrl, params, signature))) {
      log("rejected: bad signature");
      return new Response("Forbidden", { status: 403 });
    }

    const parsed = provider.parseInbound(params);
    if (!parsed) {
      // Not an inbound message we handle (e.g. a status callback). 200 so Twilio does not retry.
      log("ignored: not an inbound message");
      return reply([]);
    }

    if (!(await store.markProcessed(parsed.messageSid))) {
      log("ignored: duplicate", { messageSid: parsed.messageSid });
      return reply([]);
    }

    let language: Language | null = null;
    try {
      const reporter: ReporterSnapshot = await store.findOrCreateReporter({
        phoneE164: parsed.from,
        phoneHash: await hashPhone(parsed.from, config.phoneHashSalt),
        phoneLast4: last4(parsed.from),
        channel: parsed.channel,
      });
      language = reporter.language;

      const session: Session | null = await store.loadActiveSession(reporter.id);
      const media = await downloadMedia(reporter.id, parsed.messageSid, parsed.media);

      const receivedAt = now().toISOString();
      const result = engine(session, {
        messageSid: parsed.messageSid,
        channel: parsed.channel,
        text: parsed.text,
        media,
        location: parsed.location,
        receivedAt,
        reporter,
      });

      await store.saveSession(reporter.id, result.nextSession);
      if (result.reporterUpdate && Object.keys(result.reporterUpdate).length > 0) {
        await store.updateReporter(reporter.id, result.reporterUpdate);
      }

      const outbound = result.outboundMessages.map((m) => m.text);
      const logRows: MessageLogRow[] = [
        { reporterId: reporter.id, direction: "inbound", body: inboundLogBody(parsed) },
        ...outbound.map((body) => ({ reporterId: reporter.id, direction: "outbound" as const, body })),
      ];
      await store.logMessages(logRows);

      return reply(outbound);
    } catch (err) {
      log("error handling message", {
        messageSid: parsed.messageSid,
        error: err instanceof Error ? err.message : String(err),
      });
      return reply([language ? t("error_generic", language) : bilingual("error_generic")]);
    }
  };
}
