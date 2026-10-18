// The school assessment conversation engine: a pure function.
// (session, inboundMessage) => { nextSession, outboundMessages, reporterUpdate?, submission? }
// No I/O. All copy comes from flow.ts and strings.ts.
import { FIRST_REPORT_STEP, FLOW, STEP_BY_ID, type ChoiceStep, type Step } from "./flow.ts";
import { cleanText, isSkip, matchOption, normalize, parseCommand, parseMilestoneCode, parseNumber } from "./parse.ts";
import { t } from "./strings.ts";
import {
  REF_CODE_TOKEN,
  type Attendance,
  type Engine,
  type EngineResult,
  type InboundMessage,
  type Language,
  type MilestoneReport,
  type ReporterUpdate,
  type Session,
  type StoredMedia,
  type Submission,
} from "./types.ts";

export const FLOW_NAME = "school_assessment";
/** After this much silence, offer to continue or start over. */
export const RESUME_GAP_MS = 30 * 60 * 1000;
/** Sessions expire after 72 hours of inactivity (AGENTS.md section 5). */
export const SESSION_EXPIRY_MS = 72 * 60 * 60 * 1000;

const PRE_CONSENT_STEPS = new Set(["language", "consent"]);
const RESUME = "resume";
const MENU = "menu";
const DONE = "done";
/** Returning reporters with a school: report another school or send weekly attendance. */
const HOME = "home";
const ATT_PRESENT = "att_present";
const ATT_ENROLLED = "att_enrolled";
/** A partner reporting a project milestone ("DONE PJ-104"), waiting for the photo. */
const MS_PHOTO = "ms_photo";
/** Steps that are not part of a school report, so the resume prompt never interrupts them. */
const NON_REPORT_STEPS = new Set([RESUME, MENU, HOME, ATT_PRESENT, ATT_ENROLLED, MS_PHOTO]);
const MAX_STUDENTS = 20_000;
/** "ATT 212 250" (present, enrolled) from anywhere in the chat. Works well over SMS. */
const ATT_SHORTCUT = /^(?:att|attendance|presence|presences)\s+(\d{1,5})\s+(\d{1,5})$/;
const ATT_SHORTCUT_START = /^(?:att|attendance|presence|presences)\s+\d/;

type Answers = Record<string, unknown>;

interface Ctx {
  session: Session | null;
  inbound: InboundMessage;
  answers: Answers;
  step: string;
}

interface Turn {
  step: string;
  answers: Answers;
  messages: string[];
  status?: Session["status"];
  reporterUpdate?: ReporterUpdate;
  submission?: Submission;
  attendance?: Attendance;
  milestone?: MilestoneReport;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(answers: Answers, key: string): string | null {
  const v = answers[key];
  return typeof v === "string" ? v : null;
}

function languageOf(ctx: Ctx): Language | null {
  const chosen = str(ctx.answers, "language");
  if (chosen === "en" || chosen === "fr") return chosen;
  return ctx.inbound.reporter.language;
}

function isConsented(ctx: Ctx): boolean {
  return ctx.inbound.reporter.consentAt !== null;
}

function history(answers: Answers): string[] {
  return Array.isArray(answers._history) ? (answers._history as string[]) : [];
}

function nextStepAfter(stepId: string, ctx: Ctx): string {
  const index = FLOW.findIndex((s) => s.id === stepId);
  for (let i = index + 1; i < FLOW.length; i++) {
    const step = FLOW[i]!;
    if (step.whatsappOnly && ctx.inbound.channel === "sms") continue;
    return step.id;
  }
  return "confirm";
}

function labelFor(stepId: string, value: string | null, lang: Language): string {
  const step = STEP_BY_ID.get(stepId);
  if (!value || !step || step.kind !== "choice") return value ?? "";
  return step.options.find((o) => o.value === value)?.label[lang] ?? value;
}

function summary(answers: Answers, lang: Language): string {
  const yesNo = (v: boolean) => t(v ? "yes" : "no", lang);
  const lines = t("summary_lines", lang, {
    school: str(answers, "school_name") ?? "",
    town: str(answers, "town") ?? "",
    region: labelFor("region", str(answers, "region"), lang),
    enrollment: labelFor("enrollment", str(answers, "enrollment"), lang),
    building: labelFor("building", str(answers, "building"), lang),
    power: labelFor("power", str(answers, "power"), lang),
    connectivity: labelFor("connectivity", str(answers, "connectivity"), lang),
    devices: labelFor("devices", str(answers, "devices"), lang),
    need: labelFor("top_need", str(answers, "top_need"), lang),
    photo: yesNo(Boolean(answers.photo)),
    location: yesNo(Boolean(answers.location)),
    notes: yesNo(Boolean(answers.notes) || Boolean(answers.voice_note)),
  });
  return `${t("summary_intro", lang)}\n${lines}\n\n${t("summary_options", lang)}`;
}

function promptFor(stepId: string, ctx: Ctx): string {
  const lang = languageOf(ctx) ?? "fr";
  if (stepId === RESUME) {
    const school = str(ctx.answers, "school_name") ?? t("resume_unnamed_school", lang);
    return t("resume_prompt", lang, { school });
  }
  if (stepId === MENU) return t("menu", lang);
  if (stepId === HOME) return t("home_menu", lang, { school: ctx.inbound.reporter.lastSchoolName ?? "" });
  if (stepId === ATT_PRESENT) return t("att_present", lang);
  if (stepId === ATT_ENROLLED) return t("att_enrolled", lang);
  if (stepId === MS_PHOTO) {
    return t("ms_ask_photo", lang, {
      project: str(ctx.answers, "ms_project") ?? "",
      school: str(ctx.answers, "ms_school") ?? "",
      milestone: str(ctx.answers, "ms_milestone") ?? "",
    });
  }
  const step = STEP_BY_ID.get(stepId);
  if (!step) return "";
  if (step.kind === "confirm") return summary(ctx.answers, lang);
  if (step.kind === "choice") {
    const options = step.options.map((o, i) => `${i + 1}. ${o.label[lang]}`).join("\n");
    return `${step.prompt[lang]}\n${options}`;
  }
  return step.prompt[lang];
}

/** Moves forward from `fromStep`, recording history so BACK works. */
function advance(ctx: Ctx, fromStep: string, answers: Answers, extra: Partial<Turn> = {}): Turn {
  const step = nextStepAfter(fromStep, ctx);
  const next: Answers = { ...answers, _history: [...history(answers), fromStep] };
  return { step, answers: next, messages: [promptFor(step, { ...ctx, answers: next })], ...extra };
}

function reask(ctx: Ctx, hint: string | null): Turn {
  const prompt = promptFor(ctx.step, ctx);
  return { step: ctx.step, answers: ctx.answers, messages: [hint ? `${hint}\n\n${prompt}` : prompt] };
}

function choiceHint(ctx: Ctx, max: number): string {
  return t("hint_choice", languageOf(ctx), { max });
}

// ---------------------------------------------------------------------------
// Starting and restarting
// ---------------------------------------------------------------------------

function startReport(ctx: Ctx, lead: string | null): Turn {
  const language = ctx.inbound.reporter.language;
  if (isConsented(ctx) && language) {
    const answers: Answers = { language, _history: [] };
    const prompt = promptFor(FIRST_REPORT_STEP, { ...ctx, answers });
    return { step: FIRST_REPORT_STEP, answers, messages: [lead ? `${lead}\n\n${prompt}` : prompt] };
  }
  const answers: Answers = { _history: [] };
  return { step: "language", answers, messages: [promptFor("language", { ...ctx, answers })] };
}

/** First message of a new conversation. Returning reporters with a school get the home menu. */
function startConversation(ctx: Ctx): Turn {
  const { language, consentAt, lastSchoolName } = ctx.inbound.reporter;
  if (consentAt && language && lastSchoolName) {
    const answers: Answers = { language, _history: [] };
    return { step: HOME, answers, messages: [promptFor(HOME, { ...ctx, answers })] };
  }
  return startReport(ctx, consentAt ? t("welcome_back_new_report", language) : null);
}

function restart(ctx: Ctx): Turn {
  if (!isConsented(ctx)) return startReport(ctx, null);
  const lang = languageOf(ctx) ?? "fr";
  const answers: Answers = { language: lang, _history: [] };
  const prompt = promptFor(FIRST_REPORT_STEP, { ...ctx, answers });
  return { step: FIRST_REPORT_STEP, answers, messages: [`${t("restarted", lang)}\n\n${prompt}`] };
}

// ---------------------------------------------------------------------------
// Global commands
// ---------------------------------------------------------------------------

function handleCommand(ctx: Ctx, command: string): Turn | null {
  const lang = languageOf(ctx);
  const preConsent = PRE_CONSENT_STEPS.has(ctx.step);
  switch (command) {
    case "help":
      if (ctx.step === "language") return reask(ctx, null);
      return reask(ctx, t("help", lang));
    case "restart":
      return restart(ctx);
    case "menu": {
      if (preConsent) return reask(ctx, null);
      const returnTo = ctx.step === MENU || ctx.step === RESUME ? str(ctx.answers, "_return_to") : ctx.step;
      const answers = { ...ctx.answers, _return_to: returnTo ?? FIRST_REPORT_STEP };
      return { step: MENU, answers, messages: [t("menu", lang)] };
    }
    case "back": {
      if (ctx.step === MENU || ctx.step === RESUME) return returnTo(ctx);
      const past = [...history(ctx.answers)];
      let previous = past.pop();
      if (previous && PRE_CONSENT_STEPS.has(previous) && isConsented(ctx)) previous = undefined;
      if (!previous) return reask(ctx, t("nothing_to_go_back_to", lang));
      const answers = { ...ctx.answers, _history: past };
      return { step: previous, answers, messages: [promptFor(previous, { ...ctx, answers })] };
    }
    default:
      return null;
  }
}

function returnTo(ctx: Ctx): Turn {
  const target = str(ctx.answers, "_return_to") ?? FIRST_REPORT_STEP;
  const answers = { ...ctx.answers };
  delete answers._return_to;
  return { step: target, answers, messages: [promptFor(target, { ...ctx, answers })] };
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function handleResume(ctx: Ctx, input: string): Turn {
  const n = parseNumber(input);
  if (n === 1) return returnTo(ctx);
  if (n === 2) return restart(ctx);
  return reask(ctx, choiceHint(ctx, 2));
}

function handleMenu(ctx: Ctx, input: string): Turn {
  const n = parseNumber(input);
  if (n === 1) return returnTo(ctx);
  if (n === 2) return restart(ctx);
  if (n === 3) {
    const answers = { ...ctx.answers };
    return { step: "language", answers, messages: [promptFor("language", { ...ctx, answers })] };
  }
  return reask(ctx, choiceHint(ctx, 3));
}

function handleHome(ctx: Ctx, input: string): Turn {
  const n = parseNumber(input);
  if (n === 1 || ["report", "signaler"].includes(input)) return startReport(ctx, null);
  if (n === 2 || ["att", "attendance", "presence", "presences"].includes(input)) {
    return { step: ATT_PRESENT, answers: ctx.answers, messages: [promptFor(ATT_PRESENT, ctx)] };
  }
  return reask(ctx, choiceHint(ctx, 2));
}

function parseCount(normalized: string): number | null {
  if (!/^\d{1,5}$/.test(normalized)) return null;
  const n = Number(normalized);
  return n <= MAX_STUDENTS ? n : null;
}

function attendanceThanks(ctx: Ctx, attendance: Attendance): string {
  return t("att_thanks", languageOf(ctx), {
    ...attendance,
    school: ctx.inbound.reporter.lastSchoolName ?? "",
    rate: Math.round((attendance.present / attendance.enrolled) * 100),
  });
}

function handleAttendance(ctx: Ctx, input: string): Turn {
  const lang = languageOf(ctx);
  const count = parseCount(input);
  if (ctx.step === ATT_PRESENT) {
    if (count === null) return reask(ctx, t("att_hint_number", lang));
    const answers = { ...ctx.answers, att_present: count };
    return { step: ATT_ENROLLED, answers, messages: [promptFor(ATT_ENROLLED, { ...ctx, answers })] };
  }
  const present = typeof ctx.answers.att_present === "number" ? ctx.answers.att_present : 0;
  if (count === null || count < 1) return reask(ctx, t("att_hint_number", lang));
  if (count < present) return reask(ctx, t("att_hint_enrolled", lang, { present }));
  const attendance = { present, enrolled: count };
  return { step: DONE, answers: ctx.answers, status: "completed", messages: [attendanceThanks(ctx, attendance)], attendance };
}

/**
 * "ATT 212 250" from anywhere. A report in progress is kept: the reply ends with its current question.
 * Returns null when the message is not an attendance shortcut.
 */
function handleShortcut(ctx: Ctx, input: string, active: boolean): Turn | null {
  if (!ATT_SHORTCUT_START.test(input) || !isConsented(ctx)) return null;
  const inReport = active && !NON_REPORT_STEPS.has(ctx.step);
  // In a free-text answer only the exact shortcut counts, so a note like
  // "Attendance 40% since the roof fell" is saved as written.
  const kind = STEP_BY_ID.get(ctx.step)?.kind;
  if (inReport && (kind === "text" || kind === "notes") && !ATT_SHORTCUT.test(input)) return null;
  const reply = (text: string, attendance?: Attendance): Turn => {
    const turn: Turn = inReport
      ? { step: ctx.step, answers: ctx.answers, messages: [`${text}\n\n${promptFor(ctx.step, ctx)}`] }
      : { step: DONE, answers: {}, status: "completed", messages: [text] };
    return attendance ? { ...turn, attendance } : turn;
  };

  if (!ctx.inbound.reporter.lastSchoolName) {
    const lead = t("att_no_school", languageOf(ctx));
    return inReport ? reply(lead) : startReport(ctx, lead);
  }
  const match = ATT_SHORTCUT.exec(input);
  const present = match ? parseCount(match[1]!) : null;
  const enrolled = match ? parseCount(match[2]!) : null;
  if (present === null || enrolled === null || enrolled < 1 || present > enrolled) {
    return reply(t("att_hint_shortcut", languageOf(ctx)));
  }
  const attendance = { present, enrolled };
  return reply(attendanceThanks(ctx, attendance), attendance);
}

function milestoneDone(ctx: Ctx, photo: MilestoneReport["photo"]): Turn {
  const a = ctx.answers;
  const milestone = { code: str(a, "ms_code") ?? "", photo };
  const message = t("ms_thanks", languageOf(ctx), {
    milestone: str(a, "ms_milestone") ?? "",
    done: (typeof a.ms_done === "number" ? a.ms_done : 0) + 1,
    total: typeof a.ms_total === "number" ? a.ms_total : 0,
  });
  return { step: DONE, answers: a, status: "completed", messages: [message], milestone };
}

/**
 * "DONE PJ-104" from a partner: show the project's next milestone and ask for a photo
 * (SMS has no photos, so it is recorded straight away). Returns null for any other message.
 */
function handleMilestoneCommand(ctx: Ctx, input: string, active: boolean): Turn | null {
  const code = parseMilestoneCode(input);
  if (!code || !isConsented(ctx)) return null;
  const lang = languageOf(ctx);
  // Only protect a report that has really started; a partner who has just consented sits at the role question.
  const started = active && !NON_REPORT_STEPS.has(ctx.step) && str(ctx.answers, "school_name") !== null;
  if (started) return reask(ctx, t("ms_finish_report_first", lang));

  const project = ctx.inbound.project;
  if (!project) return { step: DONE, answers: {}, status: "completed", messages: [t("ms_unknown", lang, { code })] };
  if (!project.nextMilestone) {
    return { step: DONE, answers: {}, status: "completed", messages: [t("ms_all_done", lang, { project: project.projectTitle })] };
  }
  const answers: Answers = {
    language: lang ?? "fr",
    ms_code: project.code,
    ms_project: project.projectTitle,
    ms_school: project.schoolName,
    ms_milestone: project.nextMilestone,
    ms_done: project.done,
    ms_total: project.total,
  };
  const next = { ...ctx, answers };
  if (ctx.inbound.channel === "sms") return milestoneDone(next, null);
  return { step: MS_PHOTO, answers, messages: [promptFor(MS_PHOTO, next)] };
}

function handleMilestonePhoto(ctx: Ctx, input: string): Turn {
  const photo = ctx.inbound.media.find((m) => m.type === "photo");
  if (photo) return milestoneDone(ctx, photo);
  if (isSkip(input)) return milestoneDone(ctx, null);
  return { step: ctx.step, answers: ctx.answers, messages: [t("ms_hint_photo", languageOf(ctx))] };
}

function handleChoice(ctx: Ctx, step: ChoiceStep, input: string): Turn {
  const option = matchOption(step.options, input);
  if (!option) return reask(ctx, choiceHint(ctx, step.options.length));
  const answers: Answers = { ...ctx.answers, [step.id]: option.value };
  const now = ctx.inbound.receivedAt;

  if (step.id === "language") {
    const language = option.value as Language;
    if (isConsented(ctx)) {
      // Changing language from the menu: save it and go back to where they were.
      const back = { ...answers };
      delete back._return_to;
      const target = str(ctx.answers, "_return_to") ?? FIRST_REPORT_STEP;
      return {
        step: target,
        answers: back,
        messages: [promptFor(target, { ...ctx, answers: back })],
        reporterUpdate: { language },
      };
    }
    return advance(ctx, step.id, answers);
  }

  if (step.id === "consent") {
    if (option.value === "decline") {
      // Collect nothing: drop all answers and close the session.
      return { step: DONE, answers: {}, status: "abandoned", messages: [t("consent_declined", languageOf(ctx))] };
    }
    const language = (str(answers, "language") as Language | null) ?? "fr";
    return advance(ctx, step.id, answers, { reporterUpdate: { language, consentAt: now } });
  }

  if (step.id === "role") {
    return advance(ctx, step.id, answers, { reporterUpdate: { role: option.value as ReporterUpdate["role"] } });
  }

  return advance(ctx, step.id, answers);
}

function handleStep(ctx: Ctx, step: Step, input: string): Turn {
  const lang = languageOf(ctx);
  const { inbound } = ctx;
  switch (step.kind) {
    case "choice":
      return handleChoice(ctx, step, input);

    case "text": {
      const value = cleanText(inbound.text);
      if (value.length < step.minLength || value.length > step.maxLength) {
        return reask(ctx, t("hint_text", lang, { min: step.minLength, max: step.maxLength }));
      }
      return advance(ctx, step.id, { ...ctx.answers, [step.id]: value });
    }

    case "photo": {
      const photo = inbound.media.find((m) => m.type === "photo");
      if (photo) return advance(ctx, step.id, { ...ctx.answers, photo });
      if (isSkip(input)) return advance(ctx, step.id, { ...ctx.answers, photo: null });
      return { step: ctx.step, answers: ctx.answers, messages: [t("hint_photo", lang)] };
    }

    case "location": {
      if (inbound.location) return advance(ctx, step.id, { ...ctx.answers, location: inbound.location });
      if (isSkip(input)) return advance(ctx, step.id, { ...ctx.answers, location: null });
      return { step: ctx.step, answers: ctx.answers, messages: [t("hint_location", lang)] };
    }

    case "notes": {
      const voice = inbound.media.find((m) => m.type === "audio") ?? null;
      const text = cleanText(inbound.text);
      const hasText = text.length > 0 && !isSkip(input);
      if (hasText && text.length > step.maxLength) {
        return reask(ctx, t("hint_notes", lang, { max: step.maxLength }));
      }
      if (voice || hasText || isSkip(input)) {
        return advance(ctx, step.id, { ...ctx.answers, notes: hasText ? text : null, voice_note: voice });
      }
      return reask(ctx, t("hint_notes", lang, { max: step.maxLength }));
    }

    case "confirm": {
      const n = parseNumber(input);
      const submit = n === 1 || ["submit", "envoyer", "send", "yes", "oui", "ok"].includes(input);
      if (submit) return submitReport(ctx);
      if (n === 2) return restart(ctx);
      return reask(ctx, choiceHint(ctx, 2));
    }
  }
}

function submitReport(ctx: Ctx): Turn {
  const a = ctx.answers;
  const location = a.location as { lat: number; lng: number } | null | undefined;
  const media = [a.photo, a.voice_note].filter((m): m is StoredMedia => Boolean(m));
  const submission: Submission = {
    school: {
      name: str(a, "school_name") ?? "",
      regionCode: str(a, "region") ?? "",
      town: str(a, "town") ?? "",
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
    },
    assessment: {
      enrollmentBand: str(a, "enrollment") ?? "",
      buildingCondition: str(a, "building") ?? "",
      powerSource: str(a, "power") ?? "",
      connectivity: str(a, "connectivity") ?? "",
      devices: str(a, "devices") ?? "",
      topNeed: str(a, "top_need") ?? "",
      notes: str(a, "notes"),
    },
    media,
  };
  return {
    step: DONE,
    answers: a,
    status: "completed",
    messages: [t("thank_you", languageOf(ctx), { ref: REF_CODE_TOKEN })],
    submission,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function toResult(ctx: Ctx, turn: Turn): EngineResult {
  const result: EngineResult = {
    nextSession: {
      id: ctx.session?.id ?? null,
      flow: FLOW_NAME,
      step: turn.step,
      answers: turn.answers,
      status: turn.status ?? "active",
      updatedAt: ctx.inbound.receivedAt,
    },
    outboundMessages: turn.messages.map((text) => ({ text })),
  };
  if (turn.reporterUpdate) result.reporterUpdate = turn.reporterUpdate;
  if (turn.submission) result.submission = turn.submission;
  if (turn.attendance) result.attendance = turn.attendance;
  if (turn.milestone) result.milestone = turn.milestone;
  return result;
}

export const assessmentEngine: Engine = (session, inbound) => {
  const active = session && session.status === "active" && session.flow === FLOW_NAME ? session : null;
  const ctx: Ctx = {
    // Keep the row id so an expired or non-assessment session is reused rather than duplicated.
    session,
    inbound,
    answers: active?.answers ?? {},
    step: active?.step ?? "",
  };

  const input = normalize(inbound.text);
  const idle = active ? Date.parse(inbound.receivedAt) - Date.parse(active.updatedAt) : 0;
  const live = Boolean(active) && idle <= SESSION_EXPIRY_MS;

  const shortcut = handleShortcut(ctx, input, live) ?? handleMilestoneCommand(ctx, input, live);
  if (shortcut) return toResult(ctx, shortcut);

  if (!live) return toResult(ctx, startConversation(ctx));

  const command = parseCommand(input);
  if (command) {
    const turn = handleCommand(ctx, command);
    if (turn) return toResult(ctx, turn);
  }

  const midReport = !PRE_CONSENT_STEPS.has(ctx.step) && !NON_REPORT_STEPS.has(ctx.step);
  if (idle > RESUME_GAP_MS && midReport) {
    const answers = { ...ctx.answers, _return_to: ctx.step };
    return toResult(ctx, { step: RESUME, answers, messages: [promptFor(RESUME, { ...ctx, answers })] });
  }

  if (ctx.step === RESUME) return toResult(ctx, handleResume(ctx, input));
  if (ctx.step === MENU) return toResult(ctx, handleMenu(ctx, input));
  if (ctx.step === HOME) return toResult(ctx, handleHome(ctx, input));
  if (ctx.step === ATT_PRESENT || ctx.step === ATT_ENROLLED) return toResult(ctx, handleAttendance(ctx, input));
  if (ctx.step === MS_PHOTO) return toResult(ctx, handleMilestonePhoto(ctx, input));

  const step = STEP_BY_ID.get(ctx.step);
  if (!step) return toResult(ctx, startReport(ctx, null));
  return toResult(ctx, handleStep(ctx, step, input));
};
