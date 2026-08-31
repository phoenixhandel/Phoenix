import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TurnstileCaptcha } from "./TurnstileCaptcha";

type TurnstileOptions = {
  callback: (token: string) => void;
};

describe("TurnstileCaptcha", () => {
  let renderWidget: ReturnType<typeof vi.fn>;
  let resetWidget: ReturnType<typeof vi.fn>;
  let receivedOptions: TurnstileOptions | null;

  beforeEach(() => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "test-site-key");
    receivedOptions = null;
    renderWidget = vi.fn((_container: HTMLElement, options: TurnstileOptions) => {
      receivedOptions = options;
      return "widget-1";
    });
    resetWidget = vi.fn();
  });

  afterEach(() => {
    cleanup();
    document.getElementById("phoenix-turnstile")?.remove();
    Object.defineProperty(window, "turnstile", { configurable: true, value: undefined });
    vi.unstubAllEnvs();
  });

  it("returns a Turnstile token and clears it when refreshKey changes", async () => {
    const onToken = vi.fn();
    const onUnavailable = vi.fn();
    const { rerender } = render(<TurnstileCaptcha refreshKey={0} onToken={onToken} onUnavailable={onUnavailable} />);

    const script = document.getElementById("phoenix-turnstile");
    expect(script).toBeTruthy();
    Object.defineProperty(window, "turnstile", {
      configurable: true,
      value: { render: renderWidget, reset: resetWidget, remove: vi.fn() }
    });
    fireEvent.load(script as HTMLScriptElement);

    await waitFor(() => expect(renderWidget).toHaveBeenCalledOnce());
    act(() => receivedOptions?.callback("token-1"));
    expect(onToken).toHaveBeenLastCalledWith("token-1");

    rerender(<TurnstileCaptcha refreshKey={1} onToken={onToken} onUnavailable={onUnavailable} />);
    expect(resetWidget).toHaveBeenCalledWith("widget-1");
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it("reports an unavailable widget when the public site key is missing", async () => {
    vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
    const onToken = vi.fn();
    const onUnavailable = vi.fn();

    render(<TurnstileCaptcha refreshKey={0} onToken={onToken} onUnavailable={onUnavailable} />);

    await waitFor(() => expect(onUnavailable).toHaveBeenCalledOnce());
    expect(onToken).toHaveBeenCalledWith(null);
  });
});
