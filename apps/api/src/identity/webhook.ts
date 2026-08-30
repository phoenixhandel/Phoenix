import express, { type Express } from "express";
import Stripe from "stripe";
import type { LedgerPool } from "../ledger/credit-service.js";

const kycStatus = (status: string): "PENDING" | "VERIFIED" | "FAILED" | "REQUIRES_INPUT" | null => {
  if (status === "verified") return "VERIFIED";
  if (status === "requires_input") return "REQUIRES_INPUT";
  if (status === "processing") return "PENDING";
  if (status === "canceled") return "FAILED";
  return null;
};

export const registerStripeIdentityWebhook = (app: Express, { secretKey, webhookSecret, pool }: { secretKey: string; webhookSecret: string; pool: LedgerPool }) => {
  const stripe = new Stripe(secretKey);
  app.post("/api/webhooks/stripe/identity", express.raw({ type: "application/json" }), async (request, response) => {
    const signature = request.header("stripe-signature");
    if (!signature || !Buffer.isBuffer(request.body)) { response.status(400).json({ error: { code: "INVALID_WEBHOOK" } }); return; }
    let event: Stripe.Event;
    try { event = stripe.webhooks.constructEvent(request.body, signature, webhookSecret); }
    catch { response.status(400).json({ error: { code: "INVALID_WEBHOOK_SIGNATURE" } }); return; }
    if (!event.type.startsWith("identity.verification_session.")) { response.status(200).json({ received: true }); return; }
    const session = event.data.object as Stripe.Identity.VerificationSession;
    const userId = session.metadata?.phoenix_user_id;
    const status = kycStatus(session.status);
    if (!userId || !status) { response.status(200).json({ received: true }); return; }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query<{ provider_event_id: string }>("INSERT INTO identity_webhook_events (provider_event_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING provider_event_id", [event.id]);
      if (!inserted.rows[0]) { await client.query("COMMIT"); response.status(200).json({ received: true }); return; }
      await client.query("UPDATE users SET kyc_status = $3::kyc_status, identity_provider_status = $4 WHERE user_id = $1 AND identity_provider_id = $2", [userId, session.id, status, session.status]);
      await client.query("INSERT INTO activity_events (user_id, event_type, metadata) VALUES ($1, 'IDENTITY_VERIFICATION_UPDATED', $2::jsonb)", [userId, JSON.stringify({ status })]);
      await client.query("COMMIT");
      response.status(200).json({ received: true });
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      response.status(500).json({ error: { code: "WEBHOOK_PROCESSING_FAILED" } });
    } finally { client.release(); }
  });
};
