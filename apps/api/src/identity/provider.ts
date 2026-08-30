import Stripe from "stripe";

export type IdentitySession = { id: string; clientSecret: string | null };
export type IdentityProvider = { createSession: (input: { userId: string; idempotencyKey?: string }) => Promise<IdentitySession> };

export const createStripeIdentityProvider = (secretKey: string): IdentityProvider => {
  const stripe = new Stripe(secretKey);
  return {
    createSession: async ({ userId, idempotencyKey }) => {
      const session = await stripe.identity.verificationSessions.create({ type: "document", metadata: { phoenix_user_id: userId } }, idempotencyKey ? { idempotencyKey } : undefined);
      return { id: session.id, clientSecret: session.client_secret ?? null };
    }
  };
};
