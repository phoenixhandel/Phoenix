import { describe, expect, it } from "vitest";
import request from "supertest";

type AppModule = {
  createApp?: (config: {
    corsOrigin: string;
    databaseUrl: string;
    marketProvider: "binance" | "manual";
    port: number;
  }) => Parameters<typeof request>[0];
};

const loadAppModule = async (): Promise<AppModule> => {
  const entrypoint = "./app.js";

  return import(entrypoint).catch(() => ({}));
};

describe("API health endpoint", () => {
  it("returns the shared health contract from the health route", async () => {
    const api = await loadAppModule();

    if (!api.createApp) {
      expect(api.createApp).toBeTypeOf("function");
      return;
    }

    const response = await request(
      api.createApp({
        corsOrigin: "http://localhost:5173",
        databaseUrl: "postgresql://phoenix:phoenix@localhost:5432/phoenix",
        marketProvider: "binance",
        port: 3001
      })
    ).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "phoenix-api" });
  });
});
