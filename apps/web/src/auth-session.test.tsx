import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const auth = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
  }
}));

vi.mock("./auth-client", () => ({ getAuthClient: () => auth }));

import { AuthSessionProvider, PublicOnlyRoute, RequireVerifiedSession } from "./auth-session";

afterEach(() => {
  window.localStorage.clear();
});

describe("shared verified browser session", () => {
  it("sends a confirmed session from the public home to the account overview", async () => {
    auth.auth.getSession.mockResolvedValue({ data: { session: { access_token: "token", user: { email_confirmed_at: "2026-08-30T00:00:00.000Z" } } } });
    render(<MemoryRouter initialEntries={["/"]}><AuthSessionProvider><Routes><Route path="/" element={<PublicOnlyRoute><p>Public overview</p></PublicOnlyRoute>} /><Route path="/account" element={<p>Account overview</p>} /></Routes></AuthSessionProvider></MemoryRouter>);
    expect(await screen.findByText("Account overview")).toBeTruthy();
  });

  it("makes the initial confirmed session available to legacy authenticated requests", async () => {
    auth.auth.getSession.mockResolvedValue({ data: { session: { access_token: "fresh-token", user: { email_confirmed_at: "2026-08-30T00:00:00.000Z" } } } });
    render(<MemoryRouter><AuthSessionProvider><p>App</p></AuthSessionProvider></MemoryRouter>);
    await screen.findByText("App");
    expect(window.localStorage.getItem("phoenix_access_token")).toBe("fresh-token");
  });

  it("keeps an anonymous visitor on the public home", async () => {
    auth.auth.getSession.mockResolvedValue({ data: { session: null } });
    render(<MemoryRouter initialEntries={["/"]}><AuthSessionProvider><Routes><Route path="/" element={<PublicOnlyRoute><p>Public overview</p></PublicOnlyRoute>} /><Route path="/account" element={<p>Account overview</p>} /></Routes></AuthSessionProvider></MemoryRouter>);
    expect(await screen.findByText("Public overview")).toBeTruthy();
  });

  it("redirects an anonymous visitor away from a protected route", async () => {
    auth.auth.getSession.mockResolvedValue({ data: { session: null } });
    render(<MemoryRouter initialEntries={["/account"]}><AuthSessionProvider><Routes><Route path="/account" element={<RequireVerifiedSession><p>Secure account</p></RequireVerifiedSession>} /><Route path="/login" element={<p>Login</p>} /></Routes></AuthSessionProvider></MemoryRouter>);
    expect(await screen.findByText("Login")).toBeTruthy();
  });
});
