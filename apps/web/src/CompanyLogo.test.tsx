import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompanyLogo } from "./CompanyLogo";

describe("CompanyLogo", () => {
  it("uses Logo.dev's client image URL with a descriptive label", () => {
    render(<CompanyLogo domain="binance.com" name="Binance" size={24} />);

    const logo = screen.getByRole("img", { name: "Binance logo" });
    expect(logo.getAttribute("src")).toMatch(/^https:\/\/img\.logo\.dev\/binance\.com\?token=.*&size=24&format=webp/);
  });
});
