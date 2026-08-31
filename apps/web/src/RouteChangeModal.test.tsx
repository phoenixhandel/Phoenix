import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { RouteChangeModal } from "./RouteChangeModal";

const NavigationFixture = () => {
  const navigate = useNavigate();
  return <><button onClick={() => navigate("/next")}>Next page</button><RouteChangeModal /></>;
};

describe("RouteChangeModal", () => {
  afterEach(() => window.sessionStorage.clear());

  it("opens after a navigation and can be dismissed", async () => {
    render(<MemoryRouter initialEntries={["/"]}><NavigationFixture /></MemoryRouter>);

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close notice" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens after a full-page link navigation marks the next page", async () => {
    window.sessionStorage.setItem("phoenix_route_notice", "1");
    render(<MemoryRouter initialEntries={["/next"]}><RouteChangeModal /></MemoryRouter>);

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(window.sessionStorage.getItem("phoenix_route_notice")).toBeNull();
  });
});
