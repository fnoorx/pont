import { describe, expect, it } from "vitest";
import { STRINGS, bilingual, t } from "./strings.ts";

describe("strings", () => {
  it("has English and French for every key, within message limits", () => {
    for (const [key, value] of Object.entries(STRINGS)) {
      expect(value.en, key).toBeTruthy();
      expect(value.fr, key).toBeTruthy();
      expect(value.en.length, key).toBeLessThanOrEqual(300);
      expect(value.fr.length, key).toBeLessThanOrEqual(300);
      expect(bilingual(key as keyof typeof STRINGS).length, key).toBeLessThanOrEqual(600);
    }
  });

  it("falls back to French", () => {
    expect(t("error_generic", null)).toBe(STRINGS.error_generic.fr);
    expect(t("error_generic", "en")).toBe(STRINGS.error_generic.en);
  });
});
