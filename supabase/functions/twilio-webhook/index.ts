// Twilio webhook for WhatsApp and SMS. All logic lives in src/ so it is shared with
// Node tests and the simulator; this file only wires up Supabase and secrets.
import { createClient } from "@supabase/supabase-js";
import { engine } from "../../../src/engine/index.ts";
import { twilioProvider } from "../../../src/messaging/twilio.ts";
import { createWebhookHandler } from "../../../src/webhook/handler.ts";
import { createSupabaseStore } from "../../../src/webhook/supabaseStore.ts";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret: ${name}`);
  return value;
}

const db = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const handler = createWebhookHandler({
  config: {
    twilioAccountSid: requireEnv("TWILIO_ACCOUNT_SID"),
    twilioAuthToken: requireEnv("TWILIO_AUTH_TOKEN"),
    publicUrl: requireEnv("PUBLIC_WEBHOOK_URL"),
    phoneHashSalt: requireEnv("PHONE_HASH_SALT"),
  },
  store: createSupabaseStore(db),
  engine,
  provider: twilioProvider,
});

Deno.serve(handler);
