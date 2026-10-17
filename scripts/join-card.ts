// npm run demo:card: printable bilingual card with a QR code that opens WhatsApp with the
// sandbox join message ready to send. Writes demo/join-card.html (git-ignored).
import { mkdirSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";
import { loadEnv } from "./env.ts";

const env = loadEnv(["TWILIO_WHATSAPP_NUMBER", "TWILIO_SANDBOX_JOIN_CODE"]);
const code = env.TWILIO_SANDBOX_JOIN_CODE.replace(/^join\s+/i, "").trim();
const joinMessage = `join ${code}`;
const number = env.TWILIO_WHATSAPP_NUMBER;
const link = `https://wa.me/${number.slice(1)}?text=${encodeURIComponent(joinMessage)}`;

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const qr = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", width: 320 });

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
  .fallback { margin: 12px 0 28px; color: var(--muted); font-size: 15px; }
  .fallback b { color: var(--ink); font-family: ui-monospace, Menlo, monospace; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; text-align: left; border-top: 1px solid var(--line); padding-top: 20px; }
  @media (max-width: 640px) { .cols { grid-template-columns: 1fr; } }
  h2 { font-size: 18px; margin: 0 0 8px; color: var(--accent); }
  ol { margin: 0; padding-left: 20px; }
  li { margin: 6px 0; }
  .note { margin-top: 24px; font-size: 13px; color: var(--muted); }
  @media print { .card { margin: 0 auto; } }
</style>
</head>
<body>
<main class="card">
  <h1>Try Pont</h1>
  <p class="tag">Report a school's needs on WhatsApp &middot; Signalez les besoins d'une école sur WhatsApp</p>
  <div class="qr" role="img" aria-label="QR code that opens WhatsApp">${qr}</div>
  <p class="fallback">No camera? Send <b>${escape(joinMessage)}</b> to <b>${escape(number)}</b> on WhatsApp.<br>
  Pas de caméra ? Envoyez <b>${escape(joinMessage)}</b> au <b>${escape(number)}</b> sur WhatsApp.</p>
  <div class="cols">
    <section>
      <h2>English</h2>
      <ol>
        <li>Scan the code with your phone camera. WhatsApp opens with a message ready.</li>
        <li>Press send. You will get a confirmation from Twilio.</li>
        <li>Send <b>Hi</b> and answer the questions with numbers. It takes about 3 minutes.</li>
        <li>Watch your school appear on our dashboard.</li>
      </ol>
    </section>
    <section>
      <h2>Français</h2>
      <ol>
        <li>Scannez le code avec l'appareil photo. WhatsApp s'ouvre avec un message prêt.</li>
        <li>Appuyez sur envoyer. Twilio vous confirme l'inscription.</li>
        <li>Envoyez <b>Bonjour</b> et répondez avec des chiffres. Environ 3 minutes.</li>
        <li>Regardez votre école apparaître sur notre tableau de bord.</li>
      </ol>
    </section>
  </div>
  <p class="note">Demo only: please use a made-up school. We show just the last 4 digits of your number, and nothing about students.<br>
  Démo seulement : utilisez une école imaginaire. Nous affichons seulement les 4 derniers chiffres de votre numéro, et rien sur les élèves.</p>
</main>
</body>
</html>
`;

mkdirSync("demo", { recursive: true });
writeFileSync("demo/join-card.html", html);
console.log("Wrote demo/join-card.html");
console.log(`QR opens: ${link}`);
