import { Decimal } from "decimal.js";
import { calculateExecution, type TradeSide } from "../market/engine.js";

export type MarketOrderPlan = {
  executionPrice: string;
  quoteAmount: string;
  feeAmount: string;
  requiredBalance: { asset: string; amount: string };
  balanceDeltas: Array<{ asset: string; amountDelta: string }>;
};

export const planMarketOrder = ({
  side,
  baseAsset,
  quoteAsset,
  baseAmount,
  marketPrice,
  spread,
  slippage,
  feeRate
}: {
  side: TradeSide;
  baseAsset: string;
  quoteAsset: string;
  baseAmount: string;
  marketPrice: string;
  spread: string;
  slippage: string;
  feeRate: string;
}): MarketOrderPlan => {
  if (!/^[A-Z0-9]{2,12}$/.test(baseAsset) || !/^[A-Z0-9]{2,12}$/.test(quoteAsset) || baseAsset === quoteAsset) {
    throw new Error("Trade assets must be distinct supported asset symbols");
  }
  const execution = calculateExecution({ side, marketPrice, baseAmount, spread, slippage, feeRate });
  const base = new Decimal(baseAmount).toFixed(12);
  const quote = new Decimal(execution.quoteAmount);
  const fee = new Decimal(execution.feeAmount);

  if (side === "BUY") {
    const totalCost = quote.plus(fee).toFixed(12);
    return {
      ...execution,
      requiredBalance: { asset: quoteAsset, amount: totalCost },
      balanceDeltas: [
        { asset: baseAsset, amountDelta: base },
        { asset: quoteAsset, amountDelta: quote.plus(fee).negated().toFixed(12) }
      ]
    };
  }

  return {
    ...execution,
    requiredBalance: { asset: baseAsset, amount: base },
    balanceDeltas: [
      { asset: baseAsset, amountDelta: new Decimal(base).negated().toFixed(12) },
      { asset: quoteAsset, amountDelta: quote.minus(fee).toFixed(12) }
    ]
  };
};
