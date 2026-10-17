// The thin webhook handler (AGENTS.md section 9), written against web-standard
// Request/Response so it runs in the Edge Function (Deno) and in Vitest (Node).
// Order: verify signature, idempotency, reporter, session, media, engine, persist, reply.
// The part after signature checking is `createInboundProcessor`, which the simulator reuses.
import { bilingual, t } from "../engine/strings.ts";
import {
  REF_CODE_TOKEN,
  type Engine,
  type Language,
  type MediaType,
  type ReporterSnapshot,
  type Session,
  type StoredMedia,
} from "../engine/types.ts";
import { hashPhone, last4 } from "../lib/privacy.ts";
import { toGsm7 } from "../messaging/sms.ts";
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

type Log = (message: string, extra?: Record<string, unknown>) => void;

export interface ProcessorDeps {
  store: Store;
  engine: Engine;
  phoneHashSalt: string;
  /** Authorization header for downloading provider media (Twilio uses Basic auth). */
  mediaAuthHeader?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  log?: Log;
}

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
  log?: Log;
}

const defaultLog: Log = (message, extra) => console.log(JSON.stringify({ message, ...extra }));

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

/**
 * Handles one parsed inbound message end to end and returns the reply texts.
 * Never throws: failures become a friendly error reply.
 */
export function createInboundProcessor(deps: ProcessorDeps): (parsed: ParsedInbound) => Promise<string[]> {
  const { store, engine } = deps;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? defaultLog;

  async function downloadMedia(reporterId: string, messageSid: string, media: ProviderMedia[]): Promise<StoredMedia[]> {
    const stored: StoredMedia[] = [];
    for (const [i, m] of media.entries()) {
      const type = mediaType(m.contentType);
      const baseType = m.contentType.split(";")[0]!.trim().toLowerCase();
      const ext = EXTENSIONS[baseType];
      if (!type || !ext) {
        log("media skipped: unsupported type", { messageSid, contentType: baseType });
        continue;
      }
      const headers: Record<string, string> = deps.mediaAuthHeader ? { Authorization: deps.mediaAuthHeader } : {};
      const res = await fetchImpl(m.url, { headers });
      if (!res.ok) throw new Error(`media download failed: HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_MEDIA_BYTES) {
        log("media skipped: too large", { messageSid, bytes: bytes.byteLength });
        continue;
      }
      // Pending until linked to an assessment on submit. Provider URLs are never stored.
      const storagePath = `pending/${reporterId}/${messageSid}-${i}.${ext}`;
      await store.uploadMedia(storagePath, bytes, baseType);
      stored.push({ type, storagePath, contentType: baseType });
    }
    return stored;
  }

  return async (parsed) => {
    if (!(await store.markProcessed(parsed.messageSid))) {
      log("ignored: duplicate", { messageSid: parsed.messageSid });
      return [];
    }

    let language: Language | null = null;
    try {
      const reporter: ReporterSnapshot = await store.findOrCreateReporter({
        phoneE164: parsed.from,
        phoneHash: await hashPhone(parsed.from, deps.phoneHashSalt),
        phoneLast4: last4(parsed.from),
        channel: parsed.channel,
      });
      language = reporter.language;

      const session: Session | null = await store.loadActiveSession(reporter.id);
      const media = await downloadMedia(reporter.id, parsed.messageSid, parsed.media);

      const result = engine(session, {
        messageSid: parsed.messageSid,
        channel: parsed.channel,
        text: parsed.text,
        media,
        location: parsed.location,
        receivedAt: now().toISOString(),
        reporter,
      });

      // Submit before saving the session: if the write fails, the reporter can simply reply again.
      let refCode: string | null = null;
      if (result.submission) refCode = await store.submitAssessment(reporter.id, result.submission);
      await store.saveSession(reporter.id, result.nextSession);
      if (result.reporterUpdate && Object.keys(result.reporterUpdate).length > 0) {
        await store.updateReporter(reporter.id, result.reporterUpdate);
      }

      const outbound = result.outboundMessages.map((m) => {
        const text = refCode ? m.text.replaceAll(REF_CODE_TOKEN, refCode) : m.text;
        return parsed.channel === "sms" ? toGsm7(text) : text;
      });
      const logRows: MessageLogRow[] = [
        { reporterId: reporter.id, direction: "inbound", body: inboundLogBody(parsed) },
        ...outbound.map((body) => ({ reporterId: reporter.id, direction: "outbound" as const, body })),
      ];
      await store.logMessages(logRows);
      return outbound;
    } catch (err) {
      log("error handling message", {
        messageSid: parsed.messageSid,
        error: err instanceof Error ? err.message : String(err),
      });
      const error = language ? t("error_generic", language) : bilingual("error_generic");
      return [parsed.channel === "sms" ? toGsm7(error) : error];
    }
  };
}

export function createWebhookHandler(deps: WebhookDeps): (req: Request) => Promise<Response> {
  const { config, provider } = deps;
  const log = deps.log ?? defaultLog;
  const processInbound = createInboundProcessor({
    store: deps.store,
    engine: deps.engine,
    phoneHashSalt: config.phoneHashSalt,
    mediaAuthHeader: `Basic ${btoa(`${config.twilioAccountSid}:${config.twilioAuthToken}`)}`,
    ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
    ...(deps.now ? { now: deps.now } : {}),
    log,
  });

  const reply = (messages: string[]): Response => {
    const { body, contentType } = provider.buildReply(messages);
    return new Response(body, { status: 200, headers: { "Content-Type": contentType } });
  };

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

    return reply(await processInbound(parsed));
  };
}
