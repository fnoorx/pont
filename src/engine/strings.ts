// Every user-facing bot string outside the flow config, in English and French.
// No hardcoded copy in logic. Templates use {name} placeholders.
import type { Language } from "./types.ts";

export const STRINGS = {
  // Placeholder engine (kept for tests and fallback).
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

  // Hints when a reply does not fit the question.
  hint_choice: {
    en: "Please reply with a number from 1 to {max}.",
    fr: "Merci de répondre avec un chiffre de 1 à {max}.",
  },
  hint_text: {
    en: "Please type a short answer ({min} to {max} letters).",
    fr: "Merci d'écrire une réponse courte ({min} à {max} lettres).",
  },
  hint_photo: {
    en: "I did not get a photo. Send a photo of the building, or reply 0 to skip.",
    fr: "Je n'ai pas reçu de photo. Envoyez une photo du bâtiment, ou répondez 0 pour passer.",
  },
  hint_location: {
    en: "I did not get a location. Share your location, or reply 0 to skip.",
    fr: "Je n'ai pas reçu de position. Partagez votre position, ou répondez 0 pour passer.",
  },
  hint_notes: {
    en: "Please keep it under {max} letters, or reply 0 to skip.",
    fr: "Merci de rester sous {max} lettres, ou répondez 0 pour passer.",
  },

  // Flow moments.
  consent_declined: {
    en: "No problem. We have not saved any answers. Send a message any time if you change your mind.",
    fr: "Pas de problème. Nous n'avons gardé aucune réponse. Écrivez-nous quand vous voulez si vous changez d'avis.",
  },
  welcome_back_new_report: {
    en: "Welcome back to Pont. Let's report a school.",
    fr: "Bon retour sur Pont. Signalons une école.",
  },
  resume_prompt: {
    en: "Welcome back. You have a report in progress for {school}.\n1. Continue\n2. Start over",
    fr: "Bon retour. Vous avez un signalement en cours pour {school}.\n1. Continuer\n2. Recommencer",
  },
  resume_unnamed_school: {
    en: "a school",
    fr: "une école",
  },
  restarted: {
    en: "OK, starting a new report.",
    fr: "D'accord, nous recommençons.",
  },
  help: {
    en: "Reply with the number of your answer. Commands: BACK (previous question), RESTART (start over), MENU (options), HELP.",
    fr: "Répondez avec le chiffre de votre choix. Commandes : RETOUR (question précédente), RECOMMENCER, MENU (options), AIDE.",
  },
  menu: {
    en: "Menu:\n1. Continue my report\n2. Start a new report\n3. Change language",
    fr: "Menu :\n1. Continuer mon signalement\n2. Nouveau signalement\n3. Changer de langue",
  },
  nothing_to_go_back_to: {
    en: "This is the first question.",
    fr: "C'est la première question.",
  },

  // Summary and submission.
  summary_intro: {
    en: "Please check your report:",
    fr: "Vérifiez votre signalement :",
  },
  summary_lines: {
    en: "School: {school}\nPlace: {town}, {region}\nStudents: {enrollment}\nBuilding: {building}\nPower: {power}\nSignal: {connectivity}\nDevices: {devices}\nBiggest need: {need}\nPhoto: {photo}. Location: {location}. Note: {notes}.",
    fr: "École : {school}\nLieu : {town}, {region}\nÉlèves : {enrollment}\nBâtiment : {building}\nÉlectricité : {power}\nRéseau : {connectivity}\nAppareils : {devices}\nBesoin principal : {need}\nPhoto : {photo}. Position : {location}. Note : {notes}.",
  },
  summary_options: {
    en: "1. Submit\n2. Start over",
    fr: "1. Envoyer\n2. Recommencer",
  },
  yes: { en: "yes", fr: "oui" },
  no: { en: "no", fr: "non" },
  thank_you: {
    en: "Thank you! Your report is saved. Your reference is {ref}. PS43 will review it. Send any message to report another school.",
    fr: "Merci ! Votre signalement est enregistré. Votre référence est {ref}. PS43 va l'examiner. Écrivez-nous pour signaler une autre école.",
  },

  error_generic: {
    en: "Sorry, something went wrong. Please send your message again.",
    fr: "Désolé, un problème est survenu. Merci de renvoyer votre message.",
  },
} as const satisfies Record<string, Record<Language, string>>;

export type StringKey = keyof typeof STRINGS;

/** Look up a string and fill {placeholders}. French is the fallback (most of Cameroon is francophone). */
export function t(key: StringKey, language: Language | null | undefined, vars: Record<string, string | number> = {}): string {
  const template: string = STRINGS[key][language ?? "fr"];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/** Both languages in one message, French first, for when we do not know the reporter's language yet. */
export function bilingual(key: StringKey, vars: Record<string, string | number> = {}): string {
  return `${t(key, "fr", vars)}\n\n${t(key, "en", vars)}`;
}
