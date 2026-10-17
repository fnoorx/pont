// Temporary engine so the WhatsApp/SMS plumbing can be tested end to end.
// Replace with the real school assessment engine; it has the same signature.
import { bilingual, t } from "./strings.ts";
import type { Engine, OutboundMessage } from "./types.ts";

export const placeholderEngine: Engine = (session, inbound) => {
  const language = inbound.reporter.language;
  const outboundMessages: OutboundMessage[] = [
    { text: language ? t("placeholder_welcome", language) : bilingual("placeholder_welcome") },
  ];
  if (inbound.media.length > 0) {
    outboundMessages.push({ text: language ? t("placeholder_media", language) : bilingual("placeholder_media") });
  }
  if (inbound.location) {
    outboundMessages.push({ text: language ? t("placeholder_location", language) : bilingual("placeholder_location") });
  }

  const previousCount = typeof session?.answers.message_count === "number" ? session.answers.message_count : 0;
  return {
    nextSession: {
      id: session?.id ?? null,
      flow: "placeholder",
      step: "placeholder",
      answers: { ...session?.answers, message_count: previousCount + 1 },
      status: "active",
      updatedAt: inbound.receivedAt,
    },
    outboundMessages,
  };
};
