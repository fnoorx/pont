import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashPhone, last4, roundCoord } from "./privacy.ts";

describe("hashPhone", () => {
  it("returns the salted SHA-256 hex digest", async () => {
    const expected = createHash("sha256").update("pepper+237690000001").digest("hex");
    await expect(hashPhone("+237690000001", "pepper")).resolves.toBe(expected);
  });

  it("is stable for the same input", async () => {
    const a = await hashPhone("+237690000001", "salt");
    const b = await hashPhone("+237690000001", "salt");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes with the salt and the number", async () => {
    const base = await hashPhone("+237690000001", "salt");
    expect(await hashPhone("+237690000001", "other")).not.toBe(base);
    expect(await hashPhone("+237690000002", "salt")).not.toBe(base);
  });

  it("rejects non E.164 input and empty salt", async () => {
    await expect(hashPhone("690000001", "salt")).rejects.toThrow();
    await expect(hashPhone("+237 690 000 001", "salt")).rejects.toThrow();
    await expect(hashPhone("+237690000001", "")).rejects.toThrow();
  });
});

describe("last4", () => {
  it("returns the last four digits", () => {
    expect(last4("+237690001234")).toBe("1234");
    expect(last4("+14165550199")).toBe("0199");
  });

  it("rejects non E.164 input", () => {
    expect(() => last4("1234")).toThrow();
  });
});

describe("roundCoord", () => {
  it("rounds to one decimal place", () => {
    expect(roundCoord(3.8667)).toBe(3.9);
    expect(roundCoord(11.5167)).toBe(11.5);
    expect(roundCoord(10.0)).toBe(10);
  });

  it("rounds halves away from zero like Postgres", () => {
    expect(roundCoord(4.05)).toBe(4.1);
    expect(roundCoord(9.25)).toBe(9.3);
    expect(roundCoord(-4.05)).toBe(-4.1);
  });

  it("never returns negative zero", () => {
    expect(Object.is(roundCoord(-0.01), 0)).toBe(true);
  });

  it("rejects non-finite values", () => {
    expect(() => roundCoord(Number.NaN)).toThrow();
    expect(() => roundCoord(Infinity)).toThrow();
  });
});
