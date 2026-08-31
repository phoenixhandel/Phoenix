export type TopCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number;
  price: number;
  marketCap: number;
  change24h: number;
  volume24h: number;
};

type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number | null;
  current_price: number | null;
  market_cap: number | null;
  price_change_percentage_24h: number | null;
  total_volume: number | null;
};

export type PricePoint = { time: number; price: number };
export type HistoryRange = "1" | "7" | "30" | "90" | "365" | "max";

const coinGecko = "https://api.coingecko.com/api/v3";
const portfolioAssets: Record<string, string> = { bitcoin: "BTC", ethereum: "ETH", solana: "SOL", ripple: "XRP", tether: "USDT" };

export const getPortfolioAssetPrices = async (currency: "EUR" | "USD" | "GBP") => {
  const code = currency.toLowerCase();
  const data = await readJson<Record<string, Record<string, unknown>>>(`${coinGecko}/simple/price?ids=${Object.keys(portfolioAssets).join(",")}&vs_currencies=${code}`);
  return Object.fromEntries(Object.entries(portfolioAssets).flatMap(([id, symbol]) => typeof data[id]?.[code] === "number" ? [[symbol, data[id][code] as number]] : []));
};

export const normalizeTopCoins = (rows: CoinGeckoMarket[]): TopCoin[] =>
  rows
    .filter(
      (coin) =>
        typeof coin.market_cap_rank === "number" &&
        typeof coin.current_price === "number" &&
        typeof coin.market_cap === "number" &&
        typeof coin.total_volume === "number"
    )
    .map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      rank: coin.market_cap_rank!,
      price: coin.current_price!,
      marketCap: coin.market_cap!,
      change24h: coin.price_change_percentage_24h ?? 0,
      volume24h: coin.total_volume!
    }));

const readJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: { accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`Market data request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
};

export const getTopCoins = async (): Promise<TopCoin[]> => {
  const data = await readJson<unknown>(
    `${coinGecko}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`
  );
  if (!Array.isArray(data)) {
    throw new Error("Market data did not include an asset list");
  }
  return normalizeTopCoins(data as CoinGeckoMarket[]);
};

export const getCoinHistory = async (
  coinId: string,
  days: HistoryRange
): Promise<PricePoint[]> => {
  const data = await readJson<{ prices?: unknown }>(
    `${coinGecko}/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`
  );
  if (!Array.isArray(data.prices)) {
    throw new Error("Market data did not include price history");
  }
  return data.prices.flatMap((point) => {
    if (
      !Array.isArray(point) ||
      typeof point[0] !== "number" ||
      typeof point[1] !== "number"
    ) {
      return [];
    }
    return [{ time: point[0], price: point[1] }];
  });
};
