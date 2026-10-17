// npm run demo:card: printable bilingual card with a QR code for judges.
// If WEB_CHAT_URL is set, the QR opens the WhatsApp-style web chat (no join step).
// Otherwise it opens WhatsApp with the Twilio sandbox join message ready to send.
// Writes demo/join-card.html (git-ignored).
import { mkdirSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";
import { loadEnv } from "./env.ts";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface CardCopy {
  link: string;
  fallback: string;
  stepsEn: string[];
  stepsFr: string[];
}

function webCard(url: string): CardCopy {
  return {
    link: url,
    fallback: `No camera? Open <b>${escape(url)}</b><br>Pas de caméra ? Ouvrez <b>${escape(url)}</b>`,
    stepsEn: [
      "Scan the code with your phone camera. The chat opens straight away, no app or sign-up.",
      "Tap your answers (or type the number). It takes about 2 minutes.",
      "Add a photo of a building if you like, or tap Skip.",
      "Watch your school appear on our dashboard.",
    ],
    stepsFr: [
      "Scannez le code avec l'appareil photo. Le chat s'ouvre tout de suite, sans application ni inscription.",
      "Touchez vos réponses (ou tapez le chiffre). Environ 2 minutes.",
      "Ajoutez une photo d'un bâtiment si vous voulez, ou touchez Passer.",
      "Regardez votre école apparaître sur notre tableau de bord.",
    ],
  };
}

function whatsappCard(number: string, rawCode: string): CardCopy {
  const joinMessage = `join ${rawCode.replace(/^join\s+/i, "").trim()}`;
  return {
    link: `https://wa.me/${number.slice(1)}?text=${encodeURIComponent(joinMessage)}`,
    fallback:
      `No camera? Send <b>${escape(joinMessage)}</b> to <b>${escape(number)}</b> on WhatsApp.<br>` +
      `Pas de caméra ? Envoyez <b>${escape(joinMessage)}</b> au <b>${escape(number)}</b> sur WhatsApp.`,
    stepsEn: [
      "Scan the code with your phone camera. WhatsApp opens with a message ready.",
      "Press send. You will get a confirmation from Twilio.",
      "Send <b>Hi</b> and answer the questions with numbers. It takes about 3 minutes.",
      "Watch your school appear on our dashboard.",
    ],
    stepsFr: [
      "Scannez le code avec l'appareil photo. WhatsApp s'ouvre avec un message prêt.",
      "Appuyez sur envoyer. Twilio vous confirme l'inscription.",
      "Envoyez <b>Bonjour</b> et répondez avec des chiffres. Environ 3 minutes.",
      "Regardez votre école apparaître sur notre tableau de bord.",
    ],
  };
}

const copy = process.env.WEB_CHAT_URL
  ? webCard(loadEnv(["WEB_CHAT_URL"]).WEB_CHAT_URL)
  : (() => {
      const env = loadEnv(["TWILIO_WHATSAPP_NUMBER", "TWILIO_SANDBOX_JOIN_CODE"]);
      return whatsappCard(env.TWILIO_WHATSAPP_NUMBER, env.TWILIO_SANDBOX_JOIN_CODE);
    })();

const qr = await QRCode.toString(copy.link, { type: "svg", margin: 1, errorCorrectionLevel: "M", width: 320 });
const list = (steps: string[]) => steps.map((s) => `        <li>${s}</li>`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Try Pont</title>
<style>
  :root { --ink: #1d2a24; --muted: #5b6b63; --accent: #1f7a4d; --line: #d9e2dc; --bg: #ffffff; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .card { max-width: 820px; margin: 24px auto; padding: 32px 16px; text-align: center; }
  h1 { font-size: 40px; margin: 0; letter-spacing: -0.5px; }
  .tag { color: var(--muted); margin: 4px 0 24px; }
  .qr { width: 300px; max-width: 80vw; margin: 0 auto; }
  .qr svg { width: 100%; height: auto; display: block; }
  .fallback { margin: 12px 0 28px; color: var(--muted); font-size: 15px; overflow-wrap: anywhere; }
  .fallback b { color: var(--ink); font-family: ui-monospace, Menlo, monospace; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; text-align: left; border-top: 1px solid var(--line); padding-top: 20px; }
  @media (max-width: 640px) { .cols { grid-template-columns: 1fr; } }
  h2 { font-size: 18px; margin: 0 0 8px; color: var(--accent); }
  ol { margin: 0; padding-left: 20px; }
  li { margin: 6px 0; }
  .note { margin-top: 24px; font-size: 13px; color: var(--muted); }
</style>
</head>
<body>
<main class="card">
  <h1>Try Pont</h1>
  <p class="tag">Report a school's needs in a chat &middot; Signalez les besoins d'une école par chat</p>
  <div class="qr" role="img" aria-label="QR code">${qr}</div>
  <p class="fallback">${copy.fallback}</p>
  <div class="cols">
    <section>
      <h2>English</h2>
      <ol>
${list(copy.stepsEn)}
      </ol>
    </section>
    <section>
      <h2>Français</h2>
      <ol>
${list(copy.stepsFr)}
      </ol>
    </section>
  </div>
  <p class="note">Demo only: please use a made-up school. Nothing about students is collected.<br>
  Démo seulement : utilisez une école imaginaire. Rien n'est collecté sur les élèves.</p>
</main>
</body>
</html>
`;

mkdirSync("demo", { recursive: true });
writeFileSync("demo/join-card.html", html);
console.log("Wrote demo/join-card.html");
console.log(`QR opens: ${copy.link}`);
