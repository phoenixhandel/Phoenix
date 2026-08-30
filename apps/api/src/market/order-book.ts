import { Decimal } from "decimal.js";

export type OrderBookLevel = {
  price: string;
  amount: string;
  total: string;
};

export type OrderBook = {
  pair: string;
  timestamp: string;
  sequence: number;
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  midMarketPrice: string;
  spread: string;
};
let sequence = Date.now();

const decimal = (value: string, field: string) => {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new Error(`${field} must be a decimal string`);
  }
  const parsed = new Decimal(value);
  if (!parsed.greaterThan(0)) {
    throw new Error(`${field} must be greater than zero`);
  }

  return parsed;
};

const level = (price: Decimal, amount: Decimal): OrderBookLevel => ({
  price: price.toFixed(12),
  amount: amount.toFixed(12),
  total: price.times(amount).toFixed(12)
});

const liquidityByAsset: Record<string, Decimal> = { BTC: new Decimal("1"), ETH: new Decimal("0.82"), SOL: new Decimal("0.65"), XRP: new Decimal("0.5") };
const seededUnit = (seed: string) => {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) hash = Math.imul(hash ^ seed.charCodeAt(index), 16_777_619);
  return ((hash >>> 0) % 10_000) / 10_000;
};

export const generateOrderBook = ({
  marketPrice,
  spread,
  pair = "UNKNOWN",
  levels = 30,
  volatility = "0"
}: {
  marketPrice: string;
  spread: string;
  pair?: string;
  levels?: number;
  volatility?: string;
}): OrderBook => {
  if (!Number.isInteger(levels) || levels < 20 || levels > 50) {
    throw new Error("Order book levels must be an integer between 20 and 50");
  }

  const price = decimal(marketPrice, "Market price");
  const configuredSpread = decimal(spread, "Spread");
  const configuredVolatility = decimal(volatility === "0" ? "0.000000000001" : volatility, "Volatility");
  if (configuredSpread.greaterThanOrEqualTo(1)) {
    throw new Error("Spread must be less than one");
  }
  const halfSpread = configuredSpread.dividedBy(2);
  const increment = configuredSpread.dividedBy(levels * 2);
  const asks: OrderBookLevel[] = [];
  const bids: OrderBookLevel[] = [];
  const baseAsset = pair.replace("USDT", "").slice(0, 3);
  const liquidity = liquidityByAsset[baseAsset] ?? new Decimal("0.45");

  for (let index = 0; index < levels; index += 1) {
    const noise = new Decimal(seededUnit(`${pair}:${sequence}:${index}`)).minus("0.5").times(configuredVolatility);
    const distance = halfSpread.plus(increment.times(index)).times(new Decimal(1).plus(noise));
    const amount = new Decimal(index + 1).times("0.0135").times(liquidity).times(new Decimal(1).plus(noise.abs()));
    asks.push(level(price.times(new Decimal(1).plus(distance)), amount));
    bids.push(level(price.times(new Decimal(1).minus(distance)), amount));
  }

  return {
    pair,
    timestamp: new Date().toISOString(),
    sequence: ++sequence,
    asks,
    bids,
    midMarketPrice: price.toFixed(12),
    spread: configuredSpread.times(100).toFixed(8)
  };
};
