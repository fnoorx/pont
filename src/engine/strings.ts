// Every user-facing bot string, in English and French. No hardcoded copy in logic.
import type { Language } from "./types.ts";

export const STRINGS = {
  placeholder_welcome: {
    en: "Hello! This is Pont, from the PS43 Foundation. We are still setting up. We got your message, thank you.",
    fr: "Bonjour ! Ici Pont, de la Fondation PS43. Nous finissons la préparation. Nous avons bien reçu votre message, merci.",
  },
  placeholder_media: {
    en: "Your file was received.",
    fr: "Votre fichier a bien été reçu.",
  },
  placeholder_location: {
    en: "Your location was received.",
    fr: "Votre position a bien été reçue.",
  },
  error_generic: {
    en: "Sorry, something went wrong. Please send your message again.",
    fr: "Désolé, un problème est survenu. Merci de renvoyer votre message.",
  },
} as const satisfies Record<string, Record<Language, string>>;

export type StringKey = keyof typeof STRINGS;

/** Look up a string. French is the fallback, since most of Cameroon is francophone. */
export function t(key: StringKey, language: Language | null | undefined): string {
  return STRINGS[key][language ?? "fr"];
}

/** Both languages in one message, French first, for when we do not know the reporter's language yet. */
export function bilingual(key: StringKey): string {
  return `${STRINGS[key].fr}\n\n${STRINGS[key].en}`;
}
