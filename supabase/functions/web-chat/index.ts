// WhatsApp-style web chat endpoint. All logic lives in src/ and is shared with the Twilio webhook.
import { createClient } from "@supabase/supabase-js";
import { engine } from "../../../src/engine/index.ts";
import { createWebChatHandler } from "../../../src/webchat/handler.ts";
import { createInboundProcessor } from "../../../src/webhook/handler.ts";
import { createSupabaseStore } from "../../../src/webhook/supabaseStore.ts";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret: ${name}`);
  return value;
}

const db = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const processInbound = createInboundProcessor({
  store: createSupabaseStore(db),
  engine,
  phoneHashSalt: requireEnv("PHONE_HASH_SALT"),
});

Deno.serve(createWebChatHandler({ processInbound }));
