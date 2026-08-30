import express from "express";
import request from "supertest";
import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { registerStripeIdentityWebhook } from "./webhook.js";
import type { LedgerPool } from "../ledger/credit-service.js";

describe("Stripe Identity webhook", () => {
  it("rejects unsigned webhook payloads before they reach the database", async () => {
    let queried = false;
    const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>() => { queried = true; return { rows: [] as Row[] }; }, release: () => undefined }) };
    const app = express(); registerStripeIdentityWebhook(app, { secretKey: "sk_test_123", webhookSecret: "whsec_test", pool });
    const response = await request(app).post("/api/webhooks/stripe/identity").set("content-type", "application/json").set("stripe-signature", "invalid").send(JSON.stringify({ id: "evt_test" }));
    expect(response.status).toBe(400); expect(queried).toBe(false);
  });

  it("accepts a valid signed verification event and updates only provider-backed KYC state", async () => {
    const calls: string[] = [];
    const secret = "whsec_test";
    const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>(sql: string) => { calls.push(sql); return { rows: (sql.includes("identity_webhook_events") ? [{ provider_event_id: "evt_test" }] : []) as unknown as Row[] }; }, release: () => undefined }) };
    const app = express(); registerStripeIdentityWebhook(app, { secretKey: "sk_test_123", webhookSecret: secret, pool });
    const payload = JSON.stringify({ id: "evt_test", object: "event", type: "identity.verification_session.verified", data: { object: { id: "vs_test", object: "identity.verification_session", status: "verified", metadata: { phoenix_user_id: "user" } } } });
    const signature = new Stripe("sk_test_123").webhooks.generateTestHeaderString({ payload, secret });
    const response = await request(app).post("/api/webhooks/stripe/identity").set("content-type", "application/json").set("stripe-signature", signature).send(payload);
    expect(response.status).toBe(200); expect(calls).toEqual(expect.arrayContaining([expect.stringContaining("kyc_status"), expect.stringContaining("IDENTITY_VERIFICATION_UPDATED")]));
  });
});
