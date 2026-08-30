import { describe, expect, it } from "vitest";
import { nextOtpSendAt, otpCooldownSeconds } from "./otp-cooldown";

describe("OTP cooldown", () => {
  it("keeps resend actions unavailable for sixty seconds", () => {
    const sentAt = 1_000_000;
    const retryAt = nextOtpSendAt(sentAt);
    expect(retryAt).toBe(sentAt + 60_000);
    expect(otpCooldownSeconds(retryAt, sentAt + 1_000)).toBe(59);
    expect(otpCooldownSeconds(retryAt, retryAt)).toBe(0);
  });
});
