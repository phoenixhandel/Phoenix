import { describe, expect, it } from "vitest";

type ConfigModule = {
  loadConfig?: (environment: NodeJS.ProcessEnv) => { openAiApiKey?: string | undefined };
};

const loadConfigModule = async (): Promise<ConfigModule> => {
  const entrypoint = "./config.js";

  return import(entrypoint).catch(() => ({}));
};

describe("API configuration", () => {
  it("rejects a non-numeric port before the server starts", async () => {
    const config = await loadConfigModule();

    if (!config.loadConfig) {
      expect(config.loadConfig).toBeTypeOf("function");
      return;
    }

    expect(() => config.loadConfig?.({ PORT: "invalid" })).toThrow();
  });

  it("treats an empty optional OpenAI key as not configured", async () => {
    const config = await loadConfigModule();

    if (!config.loadConfig) {
      expect(config.loadConfig).toBeTypeOf("function");
      return;
    }

    expect(config.loadConfig({ OPENAI_API_KEY: "" }).openAiApiKey).toBeUndefined();
  });
});
