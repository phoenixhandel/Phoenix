import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminPage } from "./AdminPage";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("AdminPage", () => {
  it("lets an administrator select a user and inspect their wallet balances", async () => {
    window.localStorage.setItem("phoenix_access_token", "admin-token");
    const fetch = vi.fn((input: string) => {
      if (input.endsWith("/api/admin/users")) {
        return Promise.resolve({ ok: true, json: async () => ({ users: [{ userId: "user-1", email: "member@example.test", role: "USER", accountStatus: "ACTIVE", emailVerified: true }] }) });
      }
      if (input.endsWith("/api/admin/users/user-1/portfolio")) {
        return Promise.resolve({ ok: true, json: async () => ({ balances: { BTC: "0.000000000000", ETH: "0.000000000000", USDT: "0.000000000000" } }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetch);

    render(<AdminPage />);

    const user = await screen.findByRole("button", { name: /member@example.test/i });
    fireEvent.click(user);

    expect((await screen.findAllByText("BTC")).length).toBeGreaterThan(1);
    expect((await screen.findAllByText("0.000000000000")).length).toBe(3);
    expect(screen.getByRole("button", { name: "Apply balance update" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1.25" } });
    fireEvent.change(screen.getByPlaceholderText("Why is this adjustment needed?"), { target: { value: "Demonstration balance" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply balance update" }));

    await screen.findByText("Balance update recorded in the audit log.");
    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/admin/users/user-1/balance", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ asset: "USDT", newBalance: "1.25", reason: "Demonstration balance" })
    }));
  });
});
