import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { RouteChangeModal } from "./RouteChangeModal";

const NavigationFixture = () => {
  const navigate = useNavigate();
  return <><button onClick={() => navigate("/next")}>Next page</button><RouteChangeModal /></>;
};

describe("RouteChangeModal", () => {
  it("opens after a navigation and can be dismissed", async () => {
    render(<MemoryRouter initialEntries={["/"]}><NavigationFixture /></MemoryRouter>);

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close notice" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
