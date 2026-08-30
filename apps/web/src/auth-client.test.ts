import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  auth: {
    onAuthStateChange: vi.fn(),
    getSession: vi.fn()
  }
}));
const createClient = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({ createClient }));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("provisionApplicationUser", () => {
  it("rejects when the application account cannot be provisioned", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    auth.auth.getSession.mockResolvedValue({ data: { session: { access_token: "access-token" } } });
    createClient.mockReturnValue(auth);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const { provisionApplicationUser } = await import("./auth-client");

    await expect(provisionApplicationUser()).rejects.toThrow("ACCOUNT_PROVISIONING_FAILED");
  });
});
