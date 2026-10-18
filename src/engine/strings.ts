// Every user-facing bot string outside the flow config, in English and French.
// No hardcoded copy in logic. Templates use {name} placeholders.
import type { Language } from "./types.ts";

export const STRINGS = {
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

  // Home menu for returning reporters who already reported a school.
  home_menu: {
    en: "Welcome back to Pont. What would you like to do?\n1. Report a school\n2. Weekly attendance for {school}",
    fr: "Bon retour sur Pont. Que voulez-vous faire ?\n1. Signaler une école\n2. Présences de la semaine pour {school}",
  },

  // Weekly attendance (aggregate counts only).
  att_present: {
    en: "About how many students came to school this week? Reply with a number, for example 212.",
    fr: "Combien d'élèves sont venus à l'école cette semaine environ ? Répondez avec un nombre, par exemple 212.",
  },
  att_enrolled: {
    en: "And how many students are enrolled in total? For example 250.",
    fr: "Et combien d'élèves sont inscrits au total ? Par exemple 250.",
  },
  att_hint_number: {
    en: "Please reply with a number, for example 212.",
    fr: "Merci de répondre avec un nombre, par exemple 212.",
  },
  att_hint_enrolled: {
    en: "Enrolled must be at least the number who came ({present}). Please reply with a number.",
    fr: "Le nombre d'inscrits doit être au moins égal aux présents ({present}). Merci de répondre avec un nombre.",
  },
  att_hint_shortcut: {
    en: "Send ATT, then students present, then students enrolled. For example: ATT 212 250.",
    fr: "Envoyez ATT, puis le nombre de présents, puis le nombre d'inscrits. Par exemple : ATT 212 250.",
  },
  att_no_school: {
    en: "You can send attendance once you have reported your school. Let's report it first.",
    fr: "Vous pourrez envoyer les présences après avoir signalé votre école. Commençons par la signaler.",
  },
  att_thanks: {
    en: "Thank you! {present} of {enrolled} students came to {school} this week ({rate}%). Next week you can just send ATT {present} {enrolled}.",
    fr: "Merci ! {present} élèves sur {enrolled} sont venus à {school} cette semaine ({rate} %). La semaine prochaine, envoyez simplement ATT {present} {enrolled}.",
  },

  // Partner milestone updates ("DONE PJ-104").
  ms_ask_photo: {
    en: "{project} at {school}. Next milestone: {milestone}. Please send a photo of the finished work (the building or equipment, no people). Reply 0 to send without a photo.",
    fr: "{project} à {school}. Prochaine étape : {milestone}. Envoyez une photo du travail terminé (le bâtiment ou le matériel, sans personnes). Répondez 0 pour envoyer sans photo.",
  },
  ms_hint_photo: {
    en: "Please send a photo of the finished work, or reply 0 to send without a photo.",
    fr: "Merci d'envoyer une photo du travail terminé, ou répondez 0 pour envoyer sans photo.",
  },
  ms_thanks: {
    en: "Thank you! \"{milestone}\" is marked done ({done} of {total}). PS43 will check it and confirm.",
    fr: "Merci ! « {milestone} » est marqué comme terminé ({done} sur {total}). PS43 va vérifier et confirmer.",
  },
  ms_unknown: {
    en: "I could not find project {code}. Check the code on your PS43 project sheet and try again, for example DONE PJ-104.",
    fr: "Je n'ai pas trouvé le projet {code}. Vérifiez le code sur votre fiche projet PS43 et réessayez, par exemple FAIT PJ-104.",
  },
  ms_all_done: {
    en: "Every milestone of {project} is already done. Thank you!",
    fr: "Toutes les étapes de {project} sont déjà terminées. Merci !",
  },
  ms_finish_report_first: {
    en: "Please finish this report or send RESTART first, then send DONE and your project code.",
    fr: "Merci de terminer ce signalement ou d'écrire RECOMMENCER, puis envoyez FAIT et le code du projet.",
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
