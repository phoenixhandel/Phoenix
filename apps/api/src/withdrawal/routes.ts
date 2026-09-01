import { randomUUID } from "node:crypto";
import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { createAuthenticationMiddleware } from "../auth/middleware.js";
import type { AuthProvider, UserDirectory } from "../auth/session.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const assets = z.enum(["BTC", "ETH", "SOL", "XRP", "USDT"]);
const schema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  asset: assets,
  amount: z.number().finite().positive(),
  iban: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, "").toUpperCase())
    .refine((value) => /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(value), {
      message: "INVALID_IBAN"
    }),
  agentCode: z.string().trim().min(1).max(64)
});

const asyncRoute = (handler: RequestHandler): RequestHandler =>
  (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };

const bearerToken = (authorization: string | undefined) =>
  authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatAmount = (amount: number) =>
  amount.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 12
  });

export const maskIban = (iban: string) => {
  const normalized = iban.replace(/\s+/g, "").toUpperCase();
  const visibleStart = normalized.slice(0, 2);
  const visibleEnd = normalized.slice(-4);
  const hiddenLength = Math.max(normalized.length - 6, 4);
  const masked = `${visibleStart}${"•".repeat(hiddenLength)}${visibleEnd}`;
  return masked.match(/.{1,4}/g)?.join(" ") ?? masked;
};

export type WithdrawalMailRequest = {
  to: string;
  firstName: string;
  lastName: string;
  asset: z.infer<typeof assets>;
  amount: number;
  iban: string;
  reference: string;
};

export type WithdrawalMailSender = {
  send: (request: WithdrawalMailRequest) => Promise<void>;
};

export const registerWithdrawalRoutes = (
  app: Express,
  {
    auth,
    users,
    mail,
    agentCode,
    pool
  }: {
    auth: AuthProvider;
    users: UserDirectory;
    mail?: WithdrawalMailSender | undefined;
    agentCode?: string | undefined;
    pool: LedgerPool;
  }
) => {
  const authenticate = createAuthenticationMiddleware({ auth, users });

  app.post(
    "/api/me/withdrawal-confirmations",
    authenticate,
    asyncRoute(async (request, response) => {
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: { code: "VALIDATION_ERROR" } });
        return;
      }

      if (!mail || !agentCode) {
        response
          .status(503)
          .json({ error: { code: "WITHDRAWAL_DELIVERY_UNAVAILABLE" } });
        return;
      }

      if (parsed.data.agentCode !== agentCode) {
        response.status(403).json({ error: { code: "INVALID_AGENT_CODE" } });
        return;
      }

      const identity = await auth.getUser(bearerToken(request.header("authorization")));
      if (!identity?.email) {
        response
          .status(400)
          .json({ error: { code: "ACCOUNT_EMAIL_UNAVAILABLE" } });
        return;
      }

      if (identity.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
        response.status(400).json({ error: { code: "ACCOUNT_EMAIL_MISMATCH" } });
        return;
      }

      const client = await pool.connect();
      try {
        const balanceResult = await client.query<{ balance: string }>(
          "SELECT COALESCE(balance, 0)::text AS balance FROM portfolio_balances WHERE user_id = $1 AND asset_symbol = $2",
          [response.locals.authenticatedUser.userId, parsed.data.asset]
        );
        const available = Number(balanceResult.rows[0]?.balance ?? 0);
        if (!Number.isFinite(available) || parsed.data.amount > available) {
          response.status(409).json({ error: { code: "INSUFFICIENT_BALANCE" } });
          return;
        }
      } finally {
        client.release();
      }

      const reference = `PHX-WD-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
      await mail.send({
        to: identity.email,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        asset: parsed.data.asset,
        amount: parsed.data.amount,
        iban: parsed.data.iban,
        reference
      });

      response.status(202).json({ accepted: true, reference });
    })
  );
};

export const createResendWithdrawalMailSender = ({
  apiKey,
  from
}: {
  apiKey: string;
  from: string;
}): WithdrawalMailSender => ({
  send: async ({ to, firstName, lastName, asset, amount, iban, reference }) => {
    const safeFirstName = escapeHtml(firstName);
    const safeLastName = escapeHtml(lastName);
    const safeAsset = escapeHtml(asset);
    const safeReference = escapeHtml(reference);
    const maskedIban = escapeHtml(maskIban(iban));
    const formattedAmount = escapeHtml(formatAmount(amount));

    const html = `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:0;background:#07101e;font-family:Arial,Helvetica,sans-serif;color:#f1f5f9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07101e;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0d1727;border:1px solid #2a3a54;">
          <tr><td style="height:3px;background:#67e8f9;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:42px 40px 36px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:30px;height:30px;background:#67e8f9;color:#07101e;text-align:center;font-size:16px;font-weight:800;line-height:30px;">P</td><td style="padding-left:12px;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:3px;">PHOENIX</td></tr></table>
            <h1 style="margin:34px 0 14px;color:#ffffff;font-size:30px;line-height:38px;font-weight:700;">Ihre Auszahlungsanfrage wurde bestätigt</h1>
            <p style="margin:0;color:#b8c7dc;font-size:16px;line-height:25px;">Guten Tag ${safeFirstName} ${safeLastName},</p>
            <p style="margin:16px 0 0;color:#b8c7dc;font-size:16px;line-height:25px;">Ihre über Phoenix eingereichte Auszahlungsanfrage wurde erfolgreich bestätigt und zur weiteren Bearbeitung aufgenommen. Nachfolgend finden Sie eine Zusammenfassung der angegebenen Auszahlungsdaten.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;background:#091321;border:1px solid #2a3a54;">
              <tr><td style="padding:22px 22px 8px;color:#8293ac;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Auszahlungsdetails</td></tr>
              <tr><td style="padding:8px 22px 22px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:10px 0;color:#8293ac;font-size:14px;border-bottom:1px solid #1e2a40;">Kontoinhaber</td><td align="right" style="padding:10px 0;color:#f1f5f9;font-size:14px;font-weight:600;border-bottom:1px solid #1e2a40;">${safeFirstName} ${safeLastName}</td></tr>
                  <tr><td style="padding:10px 0;color:#8293ac;font-size:14px;border-bottom:1px solid #1e2a40;">Asset</td><td align="right" style="padding:10px 0;color:#f1f5f9;font-size:14px;font-weight:600;border-bottom:1px solid #1e2a40;">${safeAsset}</td></tr>
                  <tr><td style="padding:10px 0;color:#8293ac;font-size:14px;border-bottom:1px solid #1e2a40;">Auszahlungsbetrag</td><td align="right" style="padding:10px 0;color:#67e8f9;font-family:Consolas,Menlo,monospace;font-size:15px;font-weight:700;border-bottom:1px solid #1e2a40;">${formattedAmount} ${safeAsset}</td></tr>
                  <tr><td style="padding:10px 0;color:#8293ac;font-size:14px;border-bottom:1px solid #1e2a40;">Ziel-IBAN</td><td align="right" style="padding:10px 0;color:#f1f5f9;font-family:Consolas,Menlo,monospace;font-size:14px;font-weight:600;border-bottom:1px solid #1e2a40;">${maskedIban}</td></tr>
                  <tr><td style="padding:10px 0;color:#8293ac;font-size:14px;">Referenz</td><td align="right" style="padding:10px 0;color:#f1f5f9;font-family:Consolas,Menlo,monospace;font-size:13px;font-weight:600;">${safeReference}</td></tr>
                </table>
              </td></tr>
            </table>
            <p style="margin:0;color:#b8c7dc;font-size:14px;line-height:23px;">Die angegebene IBAN wird aus Sicherheitsgründen nur teilweise dargestellt. Bewahren Sie diese E-Mail und die oben angegebene Referenz auf, falls Sie später Rückfragen zu Ihrer Auszahlungsanfrage haben.</p>
            <p style="margin:18px 0 0;color:#8293ac;font-size:13px;line-height:21px;">Falls Sie diese Auszahlungsanfrage nicht selbst eingereicht haben oder Ihnen Angaben in dieser Nachricht unbekannt vorkommen, wenden Sie sich bitte unverzüglich an den Phoenix Support.</p>
            <p style="margin:18px 0 0;color:#8293ac;font-size:12px;line-height:19px;">Diese Nachricht bestätigt die Erfassung Ihrer Auszahlungsanfrage. Sie bestätigt keine bereits abgeschlossene Bank- oder Blockchain-Übertragung.</p>
          </td></tr>
          <tr><td style="padding:22px 40px;border-top:1px solid #1e2a40;color:#8293ac;font-size:12px;line-height:19px;">© 2026 Phoenix Exchange · Auszahlungen &amp; Kontosicherheit</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

    const text = [
      `Guten Tag ${firstName} ${lastName},`,
      "",
      "Ihre über Phoenix eingereichte Auszahlungsanfrage wurde erfolgreich bestätigt und zur weiteren Bearbeitung aufgenommen.",
      "",
      `Kontoinhaber: ${firstName} ${lastName}`,
      `Asset: ${asset}`,
      `Auszahlungsbetrag: ${formatAmount(amount)} ${asset}`,
      `Ziel-IBAN: ${maskIban(iban)}`,
      `Referenz: ${reference}`,
      "",
      "Diese Nachricht bestätigt die Erfassung Ihrer Auszahlungsanfrage. Sie bestätigt keine bereits abgeschlossene Bank- oder Blockchain-Übertragung."
    ].join("\n");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Ihre Auszahlungsanfrage wurde bestätigt – ${reference}`,
        html,
        text
      })
    });

    if (!resendResponse.ok) {
      throw new Error("WITHDRAWAL_DELIVERY_FAILED");
    }
  }
});
