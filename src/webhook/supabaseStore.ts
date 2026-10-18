// Store backed by Supabase, using the service role. Webhook and scripts only.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReporterSnapshot, Session } from "../engine/types.ts";
import type { Store } from "./store.ts";

const BUCKET = "field-media";
const UNIQUE_VIOLATION = "23505";

interface ReporterRow {
  id: string;
  channel: ReporterSnapshot["channel"];
  language: ReporterSnapshot["language"];
  role: ReporterSnapshot["role"];
  consent_at: string | null;
}

function toSnapshot(row: ReporterRow): ReporterSnapshot {
  return { id: row.id, channel: row.channel, language: row.language, role: row.role, consentAt: row.consent_at };
}

export function createSupabaseStore(db: SupabaseClient): Store {
  /** School name from the reporter's latest report, so the bot can offer weekly attendance. */
  async function lastSchoolName(reporterId: string): Promise<string | null> {
    const { data, error } = await db
      .from("assessments")
      .select("schools(name)")
      .eq("reporter_id", reporterId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`load last school: ${error.message}`);
    const school = (data as { schools: { name: string } | null } | null)?.schools;
    return school?.name ?? null;
  }

  return {
    async markProcessed(messageSid) {
      const { error } = await db.from("processed_messages").insert({ message_sid: messageSid });
      if (!error) return true;
      if (error.code === UNIQUE_VIOLATION) return false;
      throw new Error(`markProcessed: ${error.message}`);
    },

    async findOrCreateReporter(r) {
      const columns = "id, channel, language, role, consent_at";
      const existing = await db.from("reporters").select(columns).eq("phone_hash", r.phoneHash).maybeSingle();
      if (existing.error) throw new Error(`load reporter: ${existing.error.message}`);
      if (existing.data) {
        const row = existing.data as ReporterRow;
        return { ...toSnapshot(row), lastSchoolName: await lastSchoolName(row.id) };
      }

      const inserted = await db
        .from("reporters")
        .insert({ phone_e164: r.phoneE164, phone_hash: r.phoneHash, phone_last4: r.phoneLast4, channel: r.channel })
        .select(columns)
        .single();
      if (!inserted.error) return toSnapshot(inserted.data as ReporterRow);
      if (inserted.error.code !== UNIQUE_VIOLATION) throw new Error(`create reporter: ${inserted.error.message}`);

      // Created concurrently by another message from the same phone.
      const retry = await db.from("reporters").select(columns).eq("phone_hash", r.phoneHash).single();
      if (retry.error) throw new Error(`load reporter: ${retry.error.message}`);
      return toSnapshot(retry.data as ReporterRow);
    },

    async loadActiveSession(reporterId) {
      const { data, error } = await db
        .from("sessions")
        .select("id, flow, step, answers, status, updated_at")
        .eq("reporter_id", reporterId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`load session: ${error.message}`);
      if (!data) return null;
      return {
        id: data.id as string,
        flow: data.flow as string,
        step: data.step as string,
        answers: (data.answers ?? {}) as Record<string, unknown>,
        status: data.status as Session["status"],
        updatedAt: data.updated_at as string,
      };
    },

    async saveSession(reporterId, s) {
      const row = { reporter_id: reporterId, flow: s.flow, step: s.step, answers: s.answers, status: s.status };
      const { error } = s.id
        ? await db.from("sessions").update(row).eq("id", s.id)
        : await db.from("sessions").insert(row);
      if (error) throw new Error(`save session: ${error.message}`);
    },

    async updateReporter(reporterId, u) {
      const patch: Record<string, string> = {};
      if (u.language) patch.language = u.language;
      if (u.role) patch.role = u.role;
      if (u.consentAt) patch.consent_at = u.consentAt;
      const { error } = await db.from("reporters").update(patch).eq("id", reporterId);
      if (error) throw new Error(`update reporter: ${error.message}`);
    },

    async logMessages(rows) {
      if (rows.length === 0) return;
      const { error } = await db
        .from("messages")
        .insert(rows.map((r) => ({ reporter_id: r.reporterId, direction: r.direction, body: r.body })));
      if (error) throw new Error(`log messages: ${error.message}`);
    },

    async uploadMedia(path, bytes, contentType) {
      const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
      if (error) throw new Error(`upload media: ${error.message}`);
    },

    async submitAssessment(reporterId, submission) {
      const { data, error } = await db.rpc("submit_assessment", {
        p_reporter_id: reporterId,
        p_submission: submission,
      });
      if (error) throw new Error(`submit assessment: ${error.message}`);
      if (typeof data !== "string") throw new Error("submit assessment: no ref_code returned");
      return data;
    },

    async submitAttendance(reporterId, attendance) {
      const { error } = await db.rpc("submit_attendance", {
        p_reporter_id: reporterId,
        p_present: attendance.present,
        p_enrolled: attendance.enrolled,
      });
      if (error) throw new Error(`submit attendance: ${error.message}`);
    },
  };
}
