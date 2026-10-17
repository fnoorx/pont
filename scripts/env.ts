// Loads and validates environment variables for Node scripts.
// Never prints values: errors name the missing keys only.
import { existsSync } from "node:fs";
import { z } from "zod";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const nonEmpty = z.string().trim().min(1);

const schemas = {
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: nonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,
  PHONE_HASH_SALT: nonEmpty,
  DEMO_STAFF_EMAIL: z.email(),
  DEMO_STAFF_PASSWORD: z.string().min(8),
  // Not secret: shown on the judge join card.
  TWILIO_WHATSAPP_NUMBER: z.string().regex(/^\+[1-9]\d{6,14}$/, "E.164, e.g. +14155238886"),
  TWILIO_SANDBOX_JOIN_CODE: z.string().trim().min(3),
  WEB_CHAT_URL: z.url(),
} as const;

type Key = keyof typeof schemas;

export function loadEnv<K extends Key>(keys: readonly K[]): { [P in K]: string } {
  const out = {} as { [P in K]: string };
  const problems: string[] = [];
  for (const key of keys) {
    const result = schemas[key].safeParse(process.env[key]);
    if (result.success) {
      out[key] = result.data;
    } else {
      problems.push(key);
    }
  }
  if (problems.length > 0) {
    throw new Error(`Missing or invalid environment variables: ${problems.join(", ")}. See .env.example.`);
  }
  return out;
}
