import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { RouteChangeModal } from "./RouteChangeModal";

const { mockUseAuthSession } = vi.hoisted(() => ({ mockUseAuthSession: vi.fn() }));

vi.mock("./auth-session", () => ({ useAuthSession: mockUseAuthSession }));

const NavigationFixture = () => {
  const navigate = useNavigate();
  return <><button onClick={() => navigate("/next")}>Next page</button><RouteChangeModal /></>;
};

describe("RouteChangeModal", () => {
  beforeEach(() => mockUseAuthSession.mockReturnValue({ session: null, state: "verified" }));
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

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

  it("renders only the notice image and close control", async () => {
    window.sessionStorage.setItem("phoenix_route_notice", "1");
    render(<MemoryRouter initialEntries={["/next"]}><RouteChangeModal /></MemoryRouter>);

    expect(await screen.findByRole("img", { name: "Page transition notice" })).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("button", { name: "Close notice" })).toBeTruthy();
  });

  it("stays hidden for an anonymous visitor after a navigation", async () => {
    mockUseAuthSession.mockReturnValue({ session: null, state: "anonymous" });
    window.sessionStorage.setItem("phoenix_route_notice", "1");

    render(<MemoryRouter initialEntries={["/markets"]}><RouteChangeModal /></MemoryRouter>);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens after a verified session is restored on the destination page", async () => {
    mockUseAuthSession.mockReturnValue({ session: null, state: "pending" });
    window.sessionStorage.setItem("phoenix_route_notice", "1");
    const view = render(<MemoryRouter initialEntries={["/markets"]}><RouteChangeModal /></MemoryRouter>);

    expect(screen.queryByRole("dialog")).toBeNull();
    mockUseAuthSession.mockReturnValue({ session: null, state: "verified" });
    view.rerender(<MemoryRouter initialEntries={["/markets"]}><RouteChangeModal /></MemoryRouter>);

    expect(await screen.findByRole("dialog")).toBeTruthy();
  });
});
