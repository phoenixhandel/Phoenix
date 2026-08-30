import { Decimal } from "decimal.js";

const decimalInput = /^(?:0|[1-9]\d*)(?:\.\d{1,12})?$/;

export const parsePositiveAmount = (value: string) => {
  if (!decimalInput.test(value)) {
    throw new Error("Amount must be a positive decimal string with at most 12 fractional places");
  }

  const amount = new Decimal(value);
  if (!amount.greaterThan(0)) {
    throw new Error("Amount must be greater than zero");
  }

  return amount.toFixed(Math.min(amount.decimalPlaces(), 12));
};
