import type { Express, RequestHandler } from "express";

export type SupportResponder = { reply: (message: string) => Promise<string> };

const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };

export const createOpenAiSupportResponder = ({ apiKey, model }: { apiKey: string; model: string }): SupportResponder => ({
  reply: async (message) => {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        instructions: "You are Phoenix Assist, the support guide for Phoenix. Be concise, calm, and accurate. Phoenix provides account tools and public market information; it does not accept client funds, provide custody, process deposits or withdrawals, or promise external execution. Explain account access, the required confirmed-email Tier 1, optional phone Tier 2 when SMS is configured, temporarily unavailable Tier 3 identity verification, market references, orders, fees, and navigation. Never provide financial, investment, legal, or tax advice. If a request needs account-specific help, direct the person to the appropriate Phoenix page. Never ask for passwords, one-time codes, documents, payment data, or other sensitive information.",
        input: message,
        max_output_tokens: 280
      })
    });
    if (!response.ok) throw new Error("SUPPORT_PROVIDER_FAILED");
    const payload = await response.json() as { output_text?: string };
    if (!payload.output_text) throw new Error("SUPPORT_PROVIDER_EMPTY");
    return payload.output_text;
  }
});

export const registerSupportRoutes = (app: Express, responder?: SupportResponder) => {
  app.post("/api/support/assist", asyncRoute(async (request, response) => {
    const message = typeof request.body?.message === "string" ? request.body.message.trim() : "";
    if (!message || message.length > 1_000) { response.status(400).json({ error: { code: "INVALID_SUPPORT_MESSAGE" } }); return; }
    if (!responder) { response.status(503).json({ error: { code: "SUPPORT_AI_UNAVAILABLE" } }); return; }
    const answer = await responder.reply(message);
    response.status(200).json({ answer });
  }));
};
