// npm run simulate: chat with the bot in your terminal. No Twilio needed.
//
//   npm run simulate                 offline, in memory (nothing is saved)
//   npm run simulate -- --live       saves to the linked Supabase project, so the
//                                    report appears on the dashboard
//   npm run simulate -- --sms        behave like an SMS user (no photo/location steps)
//   npm run simulate -- --phone +15550001111   pretend to be a different phone
//
// In the chat: /photo sends a placeholder building photo, /voice a fake voice note,
// /location [lat lng] a location pin, /quit exits.
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { engine } from "../src/engine/index.ts";
import type { Channel } from "../src/engine/types.ts";
import type { ParsedInbound } from "../src/messaging/types.ts";
import { createInboundProcessor } from "../src/webhook/handler.ts";
import { MemoryStore } from "../src/webhook/memoryStore.ts";
import type { Store } from "../src/webhook/store.ts";
import { createSupabaseStore } from "../src/webhook/supabaseStore.ts";
import { loadEnv } from "./env.ts";
import { placeholderBuildingPng } from "./lib/placeholderPng.ts";

const args = process.argv.slice(2);
const live = args.includes("--live");
const channel: Channel = args.includes("--sms") ? "sms" : "whatsapp";
const phoneArg = args.indexOf("--phone");
const phone = phoneArg >= 0 ? args[phoneArg + 1]! : "+15550009999";

const PHOTO_URL = "https://simulator.local/photo.png";
const VOICE_URL = "https://simulator.local/voice.ogg";

// Stands in for Twilio's media server.
const fakeFetch: typeof fetch = async (input) => {
  const url = String(input);
  if (url === PHOTO_URL) return new Response(new Uint8Array(placeholderBuildingPng(Math.floor(Math.random() * 4))));
  if (url === VOICE_URL) return new Response(new Uint8Array([0x4f, 0x67, 0x67, 0x53])); // "OggS"
  return new Response("not found", { status: 404 });
};

function makeStore(): { store: Store; salt: string } {
  if (!live) return { store: new MemoryStore(), salt: "simulator-salt" };
  const env = loadEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "PHONE_HASH_SALT"]);
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { store: createSupabaseStore(db), salt: env.PHONE_HASH_SALT };
}

function toInbound(line: string): ParsedInbound | null {
  const base: ParsedInbound = {
    messageSid: "SM" + randomBytes(16).toString("hex"),
    from: phone,
    channel,
    text: line,
    media: [],
    location: null,
  };
  const [command, ...rest] = line.trim().split(/\s+/);
  switch (command) {
    case "/photo":
      return { ...base, text: "", media: [{ url: PHOTO_URL, contentType: "image/png" }] };
    case "/voice":
      return { ...base, text: "", media: [{ url: VOICE_URL, contentType: "audio/ogg" }] };
    case "/location": {
      const lat = Number(rest[0] ?? 4.05 + (Math.random() - 0.5) * 0.1);
      const lng = Number(rest[1] ?? 9.7 + (Math.random() - 0.5) * 0.1);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { ...base, text: "", location: { lat, lng } };
    }
    default:
      return base;
  }
}

async function main(): Promise<void> {
  const { store, salt } = makeStore();
  const processInbound = createInboundProcessor({
    store,
    engine,
    phoneHashSalt: salt,
    fetchImpl: fakeFetch,
    log: (message, extra) => {
      if (message.startsWith("error")) console.error(`  [${message}]`, extra ?? "");
    },
  });

  console.log(`Pont simulator (${live ? "LIVE: saving to Supabase" : "offline, in memory"}, ${channel}, phone ending ${phone.slice(-4)})`);
  console.log("Type a message. /photo /voice /location [lat lng] /quit\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
  let closed = false;
  rl.on("close", () => (closed = true));
  const prompt = () => {
    if (!closed) rl.prompt();
  };
  rl.setPrompt("you > ");
  prompt();
  try {
    // Async iteration keeps lines in order, so piped scripts work as well as typing.
    for await (const line of rl) {
      if (!process.stdin.isTTY) console.log(line);
      if (line.trim() === "/quit") break;
      const inbound = toInbound(line);
      if (!inbound) {
        console.log("  (usage: /location 4.05 9.70)\n");
        prompt();
        continue;
      }
      if (channel === "sms" && (inbound.media.length > 0 || inbound.location)) {
        console.log("  (SMS cannot send photos or locations)\n");
        prompt();
        continue;
      }
      const replies = await processInbound(inbound);
      for (const reply of replies) {
        console.log("\npont >", reply.replace(/\n/g, "\n       "), "\n");
      }
      prompt();
    }
  } finally {
    rl.close();
  }
}

main().catch((err: unknown) => {
  console.error("Simulator failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
