import { describe, expect, it } from "vitest";

type CreditModule = { planCredit?: (input: { amount: string; asset: string; userId: string }) => unknown };
const loadCreditModule = async (): Promise<CreditModule> => import("./credit.js").catch(() => ({}));

describe("ledger credit planning", () => {
  it("creates equal and opposite entries for a user credit", async () => {
    const credit = await loadCreditModule();
    if (!credit.planCredit) {
      expect(credit.planCredit).toBeTypeOf("function");
      return;
    }

    expect(credit.planCredit({ userId: "user-1", asset: "BTC", amount: "0.250000000000" })).toEqual({
      asset: "BTC",
      amount: "0.250000000000",
      entries: [
        { account: "USER", amountDelta: "0.250000000000" },
        { account: "SYSTEM_ADJUSTMENT", amountDelta: "-0.250000000000" }
      ]
    });
  });
});
