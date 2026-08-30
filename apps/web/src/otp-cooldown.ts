export const OTP_COOLDOWN_MS = 60_000;

export const nextOtpSendAt = (now = Date.now()) => now + OTP_COOLDOWN_MS;

export const otpCooldownSeconds = (availableAt: number, now = Date.now()) =>
  Math.max(0, Math.ceil((availableAt - now) / 1_000));
