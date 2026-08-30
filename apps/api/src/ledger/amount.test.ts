import { describe, expect, it } from "vitest";

type AmountModule = { parsePositiveAmount?: (value: string) => string };
const loadAmountModule = async (): Promise<AmountModule> => import("./amount.js").catch(() => ({}));

describe("financial amount parsing", () => {
  it("preserves decimal precision without JavaScript number conversion", async () => {
    const amount = await loadAmountModule();
    const parsePositiveAmount = amount.parsePositiveAmount;
    if (!parsePositiveAmount) {
      expect(parsePositiveAmount).toBeTypeOf("function");
      return;
    }

    expect(parsePositiveAmount("0.100000000001")).toBe("0.100000000001");
    expect(() => parsePositiveAmount("0")).toThrow();
    expect(() => parsePositiveAmount("1e3")).toThrow();
  });
});
