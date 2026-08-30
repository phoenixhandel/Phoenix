import { describe, expect, it } from "vitest";
import { supportGuidance } from "./support-guidance";

describe("support guidance", () => {
  it("returns a safe, product-specific answer while the AI provider is unavailable", () => {
    expect(supportGuidance("Wie bestätige ich meine Telefonnummer?", "de")).toMatch(/Telefonnummer/);
    expect(supportGuidance("How do I reset my password?", "en")).toMatch(/password/i);
  });
});
