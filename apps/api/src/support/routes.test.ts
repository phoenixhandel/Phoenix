import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerSupportRoutes } from "./routes.js";

describe("support routes", () => {
  it("returns a provider answer without exposing provider details", async () => {
    const app = express();
    app.use(express.json());
    registerSupportRoutes(app, { reply: async (message) => `Answer for: ${message}` });

    const response = await request(app).post("/api/support/assist").send({ message: "How do I verify?" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ answer: "Answer for: How do I verify?" });
  });

  it("keeps the key-free fallback explicit", async () => {
    const app = express();
    app.use(express.json());
    registerSupportRoutes(app);

    const response = await request(app).post("/api/support/assist").send({ message: "Help" });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("SUPPORT_AI_UNAVAILABLE");
  });
});
