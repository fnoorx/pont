// Forgiving input parsing for low-literacy, multilingual replies.
import type { Option } from "./flow.ts";

export type Command = "menu" | "restart" | "help" | "back";

/** Lowercase, strip accents, collapse spaces, drop surrounding punctuation and quotes. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'«»\s]+|["'«».!?,;:\s]+$/g, "");
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9, dix: 10,
};

export function parseNumber(normalized: string): number | null {
  if (/^\d{1,2}$/.test(normalized)) return Number(normalized);
  return NUMBER_WORDS[normalized] ?? null;
}

const COMMANDS: Record<string, Command> = {
  menu: "menu",
  restart: "restart",
  recommencer: "restart",
  "start over": "restart",
  help: "help",
  aide: "help",
  back: "back",
  retour: "back",
};

export function parseCommand(normalized: string): Command | null {
  return COMMANDS[normalized] ?? null;
}

const SKIP_WORDS = new Set(["0", "zero", "skip", "pass", "passer", "no", "non", "none", "rien", "aucun", "aucune", "nothing"]);

export function isSkip(normalized: string): boolean {
  return SKIP_WORDS.has(normalized);
}

/** Matches a reply to an option by number, alias, or label in either language. */
export function matchOption(options: Option[], normalized: string): Option | null {
  if (!normalized) return null;
  const n = parseNumber(normalized);
  if (n !== null) return n >= 1 && n <= options.length ? options[n - 1]! : null;
  for (const option of options) {
    if (option.aliases?.includes(normalized)) return option;
    if (normalize(option.label.en) === normalized || normalize(option.label.fr) === normalized) return option;
  }
  return null;
}

/** "done pj-104", "fait PJ 104", "termine pj104" -> "PJ-104". Takes normalized text. */
export function parseMilestoneCode(normalized: string): string | null {
  const match = /^(?:done|fait|termine)\s+pj\s*-?\s*(\d{3,4})$/.exec(normalized);
  return match ? `PJ-${match[1]}` : null;
}

/** Tidy free text for storage: collapse whitespace, trim. */
export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
