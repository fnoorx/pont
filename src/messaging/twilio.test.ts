import { describe, expect, it } from "vitest";
import { buildTwiml, parseTwilioInbound } from "./twilio.ts";

const SID = "SM" + "a".repeat(32);

describe("parseTwilioInbound", () => {
  it("parses a WhatsApp text message", () => {
    const p = parseTwilioInbound({ MessageSid: SID, From: "whatsapp:+237690000001", Body: "  1 ", NumMedia: "0" });
    expect(p).toEqual({ messageSid: SID, from: "+237690000001", channel: "whatsapp", text: "1", media: [], location: null });
  });

  it("parses an SMS message", () => {
    const p = parseTwilioInbound({ MessageSid: SID, From: "+14165550199", Body: "oui" });
    expect(p?.channel).toBe("sms");
    expect(p?.from).toBe("+14165550199");
  });

  it("collects media and location", () => {
    const p = parseTwilioInbound({
      MessageSid: "MM" + "b".repeat(32),
      From: "whatsapp:+237690000001",
      Body: "",
      NumMedia: "1",
      MediaUrl0: "https://api.twilio.com/2010-04-01/Accounts/AC1/Messages/MM1/Media/ME1",
      MediaContentType0: "image/jpeg",
      Latitude: "5.9631",
      Longitude: "10.1591",
    });
    expect(p?.media).toEqual([{ url: "https://api.twilio.com/2010-04-01/Accounts/AC1/Messages/MM1/Media/ME1", contentType: "image/jpeg" }]);
    expect(p?.location).toEqual({ lat: 5.9631, lng: 10.1591 });
    expect(p?.text).toBe("");
  });

  it("returns null for payloads that are not inbound messages", () => {
    expect(parseTwilioInbound({ MessageStatus: "delivered" })).toBeNull();
    expect(parseTwilioInbound({ MessageSid: "nope", From: "+237690000001" })).toBeNull();
    expect(parseTwilioInbound({ MessageSid: SID, From: "whatsapp:not-a-number" })).toBeNull();
  });
});

describe("buildTwiml", () => {
  it("escapes XML and supports multiple messages", () => {
    expect(buildTwiml(["a < b & c", "d's \"e\""])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>a &lt; b &amp; c</Message><Message>d&apos;s &quot;e&quot;</Message></Response>',
    );
  });

  it("returns an empty response for no messages", () => {
    expect(buildTwiml([])).toBe('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  });
});
