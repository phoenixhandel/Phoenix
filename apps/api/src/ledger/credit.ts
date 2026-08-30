import { Decimal } from "decimal.js";
import { parsePositiveAmount } from "./amount.js";

export const planCredit = ({ userId, asset, amount }: { userId: string; asset: string; amount: string }) => {
  if (!userId) {
    throw new Error("User ID is required");
  }
  const normalizedAmount = new Decimal(parsePositiveAmount(amount)).toFixed(12);
  const debit = new Decimal(normalizedAmount).negated().toFixed(12);

  return {
    asset,
    amount: normalizedAmount,
    entries: [
      { account: "USER", amountDelta: normalizedAmount },
      { account: "SYSTEM_ADJUSTMENT", amountDelta: debit }
    ]
  };
};
