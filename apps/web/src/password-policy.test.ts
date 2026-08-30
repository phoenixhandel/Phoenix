import { describe, expect, it } from "vitest";
import { passwordIssue } from "./password-policy";

describe("password policy", () => {
  it("requires all five registration password requirements", () => {
    expect(passwordIssue("short", "en")).toContain("12 characters");
    expect(passwordIssue("alllowercase12!", "en")).toContain("uppercase");
    expect(passwordIssue("ALLUPPERCASE12!", "en")).toContain("lowercase");
    expect(passwordIssue("NoDigitsHere!", "en")).toContain("number");
    expect(passwordIssue("NoSpecialChar12", "en")).toContain("special character");
    expect(passwordIssue("PhoenixSecure12!", "en")).toBeNull();
  });
});
