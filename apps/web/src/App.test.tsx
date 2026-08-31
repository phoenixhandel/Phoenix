import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { MemoryRouter } from "react-router-dom";
import { ExchangePage } from "./App";
import { useExchangeStore } from "./exchange-store";
import { LandingPage } from "./LandingPage";

type AppModule = {
  App?: ComponentType;
};

const loadAppModule = async (): Promise<AppModule> => {
  const entrypoint = "./App.tsx";

  return import(entrypoint).catch(() => ({}));
};

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
  useExchangeStore.getState().reset();
});

describe("Phoenix product access", () => {
  it("keeps the public overview available before sign-in", async () => {
    const application = await loadAppModule();

    if (!application.App) {
      expect(application.App).toBeTypeOf("function");
      return;
    }

    render(<application.App />);

    expect(await screen.findByRole("heading", { name: /ihre krypto-welt, klar organisiert/i })).toBeTruthy();
  });

  it("shows a German asset-market section without a terminal CTA", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { name: /märkte, wenn sie sie brauchen/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /explore the terminal/i })).toBeNull();
  });

  it("introduces Phoenix as a public overview before account access", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { name: /ihre krypto-welt, klar organisiert/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /krypto im überblick/i })).toBeTruthy();
  });

  it("shows official crypto logos beside the supported assets", () => {
    render(<LandingPage />);

    expect(screen.getAllByRole("img", { name: "Bitcoin logo" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("img", { name: "Ethereum logo" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("img", { name: "Solana logo" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("img", { name: "XRP logo" }).length).toBeGreaterThan(0);
  });

  it("requests homepage market data from the configured API server", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tickers: [] }) });
    vi.stubGlobal("fetch", fetch);
    render(<LandingPage />);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/market/feed?pairs=BTCUSDT,ETHUSDT,SOLUSDT,XRPUSDT,BTCETH,BTCSOL"));
  });

  it("does not show invented funds while a wallet balance is unavailable", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    render(
      <MemoryRouter>
        <ExchangePage />
      </MemoryRouter>
    );

    expect(screen.queryByText("84,372.94")).toBeNull();
    expect(screen.queryByText("0.8462")).toBeNull();
    expect(screen.getByText("Available")).toBeTruthy();
  });
});
