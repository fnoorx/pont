// The school assessment flow, defined as data (AGENTS.md section 8).
// Adding or changing a question means editing one entry here. Order = conversation order.
import type { Language } from "./types.ts";

export type Localized = Record<Language, string>;

export interface Option {
  value: string;
  label: Localized;
  /** Extra free-text replies that mean this option (normalized: lowercase, no accents). */
  aliases?: string[];
}

interface BaseStep {
  id: string;
  prompt: Localized;
  /** Only asked on WhatsApp; skipped automatically on SMS. */
  whatsappOnly?: boolean;
}

export interface ChoiceStep extends BaseStep {
  kind: "choice";
  options: Option[];
}

export interface TextStep extends BaseStep {
  kind: "text";
  minLength: number;
  maxLength: number;
}

/** Optional steps: the reporter can always skip with one reply. */
export interface PhotoStep extends BaseStep {
  kind: "photo";
}
export interface LocationStep extends BaseStep {
  kind: "location";
}
export interface NotesStep extends BaseStep {
  kind: "notes";
  maxLength: number;
}
export interface ConfirmStep extends BaseStep {
  kind: "confirm";
}

export type Step = ChoiceStep | TextStep | PhotoStep | LocationStep | NotesStep | ConfirmStep;

export const REGION_OPTIONS: Option[] = [
  { value: "AD", label: { en: "Adamawa", fr: "Adamaoua" }, aliases: ["adamawa", "adamaoua"] },
  { value: "CE", label: { en: "Centre", fr: "Centre" }, aliases: ["centre", "center"] },
  { value: "ES", label: { en: "East", fr: "Est" }, aliases: ["east", "est"] },
  { value: "EN", label: { en: "Far North", fr: "Extrême-Nord" }, aliases: ["far north", "extreme-nord", "extreme nord"] },
  { value: "LT", label: { en: "Littoral", fr: "Littoral" }, aliases: ["littoral"] },
  { value: "NO", label: { en: "North", fr: "Nord" }, aliases: ["north", "nord"] },
  { value: "NW", label: { en: "Northwest", fr: "Nord-Ouest" }, aliases: ["northwest", "north west", "nord-ouest", "nord ouest"] },
  { value: "SU", label: { en: "South", fr: "Sud" }, aliases: ["south", "sud"] },
  { value: "SW", label: { en: "Southwest", fr: "Sud-Ouest" }, aliases: ["southwest", "south west", "sud-ouest", "sud ouest"] },
  { value: "OU", label: { en: "West", fr: "Ouest" }, aliases: ["west", "ouest"] },
];

export const FLOW: Step[] = [
  {
    id: "language",
    kind: "choice",
    // Shown before we know the language, so it is bilingual in both versions.
    prompt: {
      en: "Welcome to Pont, from the PS43 Foundation.\nBienvenue sur Pont, de la Fondation PS43.\n\nChoose your language / Choisissez votre langue:",
      fr: "Welcome to Pont, from the PS43 Foundation.\nBienvenue sur Pont, de la Fondation PS43.\n\nChoose your language / Choisissez votre langue:",
    },
    options: [
      { value: "en", label: { en: "English", fr: "English" }, aliases: ["english", "anglais", "en"] },
      { value: "fr", label: { en: "Français", fr: "Français" }, aliases: ["francais", "french", "fr"] },
    ],
  },
  {
    id: "consent",
    kind: "choice",
    prompt: {
      en: "PS43 uses this chat to learn what schools need. We save your answers, your role and the last 4 digits of your phone. We never collect anything about students. Do you agree?",
      fr: "PS43 utilise ce chat pour connaître les besoins des écoles. Nous gardons vos réponses, votre rôle et les 4 derniers chiffres de votre numéro. Nous ne collectons rien sur les élèves. Êtes-vous d'accord ?",
    },
    options: [
      { value: "agree", label: { en: "I agree", fr: "J'accepte" }, aliases: ["yes", "oui", "ok", "agree", "d'accord", "daccord", "y", "o"] },
      { value: "decline", label: { en: "No", fr: "Non" }, aliases: ["no", "non", "n"] },
    ],
  },
  {
    id: "role",
    kind: "choice",
    prompt: { en: "What is your role?", fr: "Quel est votre rôle ?" },
    options: [
      { value: "headteacher", label: { en: "Headteacher", fr: "Directeur ou directrice" }, aliases: ["headteacher", "head teacher", "principal", "directeur", "directrice"] },
      { value: "teacher", label: { en: "Teacher", fr: "Enseignant(e)" }, aliases: ["teacher", "enseignant", "enseignante", "professeur"] },
      { value: "partner", label: { en: "Local partner", fr: "Partenaire local" }, aliases: ["partner", "partenaire"] },
      { value: "community", label: { en: "Community member", fr: "Membre de la communauté" }, aliases: ["community", "communaute", "parent"] },
    ],
  },
  {
    id: "school_name",
    kind: "text",
    prompt: { en: "What is the name of the school?", fr: "Quel est le nom de l'école ?" },
    minLength: 2,
    maxLength: 120,
  },
  {
    id: "region",
    kind: "choice",
    prompt: { en: "Which region is the school in?", fr: "Dans quelle région se trouve l'école ?" },
    options: REGION_OPTIONS,
  },
  {
    id: "town",
    kind: "text",
    prompt: { en: "Which town or village?", fr: "Quelle ville ou quel village ?" },
    minLength: 2,
    maxLength: 120,
  },
  {
    id: "enrollment",
    kind: "choice",
    prompt: { en: "About how many students?", fr: "Combien d'élèves environ ?" },
    options: [
      { value: "lt100", label: { en: "Under 100", fr: "Moins de 100" } },
      { value: "100_300", label: { en: "100 to 300", fr: "100 à 300" } },
      { value: "300_600", label: { en: "300 to 600", fr: "300 à 600" } },
      { value: "gt600", label: { en: "Over 600", fr: "Plus de 600" } },
    ],
  },
  {
    id: "building",
    kind: "choice",
    prompt: { en: "What condition is the building in?", fr: "Dans quel état est le bâtiment ?" },
    options: [
      { value: "good", label: { en: "Good", fr: "Bon état" }, aliases: ["good", "bon"] },
      { value: "needs_repair", label: { en: "Needs repairs", fr: "À réparer" }, aliases: ["repair", "repairs", "reparer"] },
      { value: "unsafe", label: { en: "Unsafe or no roof", fr: "Dangereux ou sans toit" }, aliases: ["unsafe", "dangereux"] },
    ],
  },
  {
    id: "power",
    kind: "choice",
    prompt: { en: "What electricity does the school have?", fr: "Quelle électricité a l'école ?" },
    options: [
      { value: "grid_reliable", label: { en: "Reliable grid", fr: "Réseau fiable" } },
      { value: "grid_unreliable", label: { en: "Unreliable grid", fr: "Réseau instable" } },
      { value: "solar", label: { en: "Solar", fr: "Solaire" }, aliases: ["solar", "solaire"] },
      { value: "generator", label: { en: "Generator", fr: "Groupe électrogène" }, aliases: ["generator", "groupe"] },
      { value: "none", label: { en: "None", fr: "Aucune" }, aliases: ["none", "aucune", "rien"] },
    ],
  },
  {
    id: "connectivity",
    kind: "choice",
    prompt: { en: "How is the mobile signal or internet at the school?", fr: "Comment est le réseau mobile ou internet à l'école ?" },
    options: [
      { value: "good", label: { en: "Good", fr: "Bon" }, aliases: ["good", "bon"] },
      { value: "weak", label: { en: "Weak", fr: "Faible" }, aliases: ["weak", "faible"] },
      { value: "none", label: { en: "None", fr: "Aucun" }, aliases: ["none", "aucun", "rien"] },
    ],
  },
  {
    id: "devices",
    kind: "choice",
    prompt: { en: "Are there computers or tablets for students?", fr: "Y a-t-il des ordinateurs ou tablettes pour les élèves ?" },
    options: [
      { value: "none", label: { en: "None", fr: "Aucun" }, aliases: ["none", "aucun"] },
      { value: "few", label: { en: "A few", fr: "Quelques-uns" }, aliases: ["few", "quelques"] },
      { value: "enough", label: { en: "Enough", fr: "Suffisamment" }, aliases: ["enough", "suffisamment"] },
    ],
  },
  {
    id: "top_need",
    kind: "choice",
    prompt: { en: "What is the school's biggest need?", fr: "Quel est le plus grand besoin de l'école ?" },
    options: [
      { value: "building", label: { en: "Building repairs", fr: "Réparer le bâtiment" } },
      { value: "furniture", label: { en: "Desks and furniture", fr: "Tables-bancs et mobilier" } },
      { value: "supplies", label: { en: "Books and supplies", fr: "Livres et fournitures" } },
      { value: "power", label: { en: "Power", fr: "Électricité" } },
      { value: "computers", label: { en: "Computers", fr: "Ordinateurs" } },
      { value: "internet", label: { en: "Internet", fr: "Internet" } },
      { value: "training", label: { en: "Teacher training", fr: "Formation des enseignants" } },
      { value: "other", label: { en: "Other", fr: "Autre" } },
    ],
  },
  {
    id: "photo",
    kind: "photo",
    whatsappOnly: true,
    prompt: {
      en: "Please send a photo of the school building. Only the building, no people please. Reply 0 to skip.",
      fr: "Envoyez une photo du bâtiment de l'école. Seulement le bâtiment, sans personnes s'il vous plaît. Répondez 0 pour passer.",
    },
  },
  {
    id: "location",
    kind: "location",
    whatsappOnly: true,
    prompt: {
      en: "If you are at the school, share your location (tap + or the clip, then Location). Reply 0 to skip.",
      fr: "Si vous êtes à l'école, partagez votre position (touchez + ou le trombone, puis Position). Répondez 0 pour passer.",
    },
  },
  {
    id: "notes",
    kind: "notes",
    maxLength: 1000,
    prompt: {
      en: "Anything else we should know? Type a message or send a voice note. Reply 0 to skip.",
      fr: "Autre chose à nous dire ? Écrivez un message ou envoyez une note vocale. Répondez 0 pour passer.",
    },
  },
  {
    id: "confirm",
    kind: "confirm",
    prompt: { en: "", fr: "" }, // Built from the answers: see summary in engine.ts.
  },
];

export const STEP_BY_ID = new Map(FLOW.map((s) => [s.id, s]));

/** First question of the report itself, after language and consent. */
export const FIRST_REPORT_STEP = "role";
