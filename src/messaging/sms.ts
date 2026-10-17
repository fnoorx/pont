// SMS helpers. Characters outside the GSM-7 alphabet (like ê, ç, ô in French) force the whole
// SMS into UCS-2, which cuts a segment from 160 to 70 characters and multiplies cost.
// For SMS replies we transliterate to GSM-7, as most Cameroonian SMS services do.

const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENDED = "^{}\\[~]|€"; // each costs 2 septets

const BASIC = new Set(GSM7_BASIC);
const EXTENDED = new Set(GSM7_EXTENDED);

const REPLACEMENTS: Record<string, string> = {
  "œ": "oe", "Œ": "OE", "’": "'", "‘": "'", "“": '"', "”": '"', "«": '"', "»": '"',
  "–": "-", "…": "...", " ": " ",
};

function isGsm(ch: string): boolean {
  return BASIC.has(ch) || EXTENDED.has(ch);
}

/** Rewrites text so it fits the GSM-7 alphabet (accents dropped only where GSM-7 lacks them). */
export function toGsm7(text: string): string {
  let out = "";
  for (const ch of text) {
    if (isGsm(ch)) {
      out += ch;
      continue;
    }
    const replacement = REPLACEMENTS[ch];
    if (replacement !== undefined) {
      out += replacement;
      continue;
    }
    const stripped = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    out += [...stripped].every(isGsm) ? stripped : "?";
  }
  return out;
}

/** Number of SMS segments a message needs. */
export function smsSegments(text: string): number {
  const chars = [...text];
  if (chars.every(isGsm)) {
    const septets = chars.reduce((n, ch) => n + (EXTENDED.has(ch) ? 2 : 1), 0);
    return septets <= 160 ? 1 : Math.ceil(septets / 153);
  }
  const units = text.length; // UTF-16 code units
  return units <= 70 ? 1 : Math.ceil(units / 67);
}
