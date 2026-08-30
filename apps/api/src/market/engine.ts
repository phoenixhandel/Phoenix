import { Decimal } from "decimal.js";

export type TradeSide = "BUY" | "SELL";

const toDecimal = (value: string, field: string) => {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new Error(`${field} must be a non-negative decimal string`);
  }

  return new Decimal(value);
};

const rate = (value: string, field: string) => {
  const parsed = toDecimal(value, field);
  if (parsed.greaterThan(1)) {
    throw new Error(`${field} must not exceed 1`);
  }

  return parsed;
};

const positive = (value: string, field: string) => {
  const parsed = toDecimal(value, field);
  if (!parsed.greaterThan(0)) {
    throw new Error(`${field} must be greater than zero`);
  }

  return parsed;
};

const fixed = (value: Decimal) => value.toFixed(12);

export const deriveCrossPrice = ({
  baseUsdtPrice,
  quoteUsdtPrice
}: {
  baseUsdtPrice: string;
  quoteUsdtPrice: string;
}) => fixed(positive(baseUsdtPrice, "Base USDT price").dividedBy(positive(quoteUsdtPrice, "Quote USDT price")));

export const calculateExecution = ({
  side,
  marketPrice,
  baseAmount,
  spread,
  slippage,
  feeRate
}: {
  side: TradeSide;
  marketPrice: string;
  baseAmount: string;
  spread: string;
  slippage: string;
  feeRate: string;
}) => {
  const market = positive(marketPrice, "Market price");
  const quantity = positive(baseAmount, "Base amount");
  const impact = rate(spread, "Spread").plus(rate(slippage, "Slippage"));
  const multiplier = side === "BUY" ? new Decimal(1).plus(impact) : new Decimal(1).minus(impact);
  if (!multiplier.greaterThan(0)) {
    throw new Error("Execution multiplier must be positive");
  }

  const executionPrice = market.times(multiplier);
  const quoteAmount = executionPrice.times(quantity);
  const feeAmount = quoteAmount.times(rate(feeRate, "Fee rate"));

  return {
    executionPrice: fixed(executionPrice),
    quoteAmount: fixed(quoteAmount),
    feeAmount: fixed(feeAmount)
  };
};

export const isMarketDataStale = ({
  updatedAt,
  now = new Date(),
  maximumAgeMs = 30_000
}: {
  updatedAt: Date;
  now?: Date;
  maximumAgeMs?: number;
}) => now.getTime() - updatedAt.getTime() > maximumAgeMs;
