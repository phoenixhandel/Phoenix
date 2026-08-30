import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "./i18n";
import { WorkspaceShell } from "./WorkspaceShell";

describe("WorkspaceShell", () => {
  it("gives protected pages a labelled navigation and clear page context", () => {
    render(
      <LanguageProvider>
        <WorkspaceShell
          active="markets"
          title="Märkte"
          description="Live Marktüberblick"
        >
          <p>Content</p>
        </WorkspaceShell>
      </LanguageProvider>
    );

    expect(
      screen.getByRole("navigation", { name: "Workspace navigation" })
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Märkte" })).toBeTruthy();
    expect(screen.getByText("Content")).toBeTruthy();
  });
});
