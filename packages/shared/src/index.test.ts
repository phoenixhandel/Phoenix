import { describe, expect, it } from "vitest";

type SharedModule = {
  apiHealth?: { status: "ok"; service: "phoenix-api" };
};

const loadSharedModule = async (): Promise<SharedModule> => {
  const entrypoint = "./index.js";

  return import(entrypoint).catch(() => ({}));
};

describe("shared API contract", () => {
  it("exports the health payload consumed by the API", async () => {
    const shared = await loadSharedModule();

    expect(shared.apiHealth).toEqual({ status: "ok", service: "phoenix-api" });
  });
});
