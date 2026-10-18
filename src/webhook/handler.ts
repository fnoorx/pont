// Handles one inbound message (AGENTS.md section 9). Shared by the web chat Edge Function and
// the simulator, so it runs in Deno and Node alike.
// Order: idempotency, reporter, session, media, engine, persist, reply.
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
import { hashPhone, hashWebClient, last4 } from "../lib/privacy.ts";
import { toGsm7 } from "../messaging/sms.ts";
import type { ParsedInbound, ProviderMedia } from "../messaging/types.ts";
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
      const res = await fetchImpl(m.url);
      if (!res.ok) throw new Error(`media download failed: HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_MEDIA_BYTES) {
        log("media skipped: too large", { messageSid, bytes: bytes.byteLength });
        continue;
      }
      // Pending until linked to an assessment on submit. Source URLs are never stored.
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
      const isWeb = parsed.channel === "web";
      const reporter: ReporterSnapshot = await store.findOrCreateReporter({
        phoneE164: isWeb ? null : parsed.from,
        phoneHash: isWeb
          ? await hashWebClient(parsed.from, deps.phoneHashSalt)
          : await hashPhone(parsed.from, deps.phoneHashSalt),
        phoneLast4: isWeb ? null : last4(parsed.from),
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
      if (result.attendance) await store.submitAttendance(reporter.id, result.attendance);
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
