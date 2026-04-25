import { describe, expect, it } from "vitest";

import { EnvValidationError, validateEnv } from "../src/env";

describe("validateEnv", () => {
  it("accepts a complete real-provider configuration", () => {
    const config = validateEnv({
      NODE_ENV: "production",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "supabase-secret",
      LLM_PROVIDER: "openai",
      LLM_API_KEY: "llm-secret",
      EMAIL_PROVIDER: "resend",
      EMAIL_API_KEY: "email-secret",
      INTERNAL_API_SECRET: "internal-secret",
      APP_BASE_URL: "https://research.example.com"
    });

    expect(config).toMatchObject({
      supabaseUrl: "https://example.supabase.co",
      llmProvider: "openai",
      emailProvider: "resend",
      appBaseUrl: "https://research.example.com",
      useMockProviders: false
    });
  });

  it("allows missing provider credentials when mock providers are enabled", () => {
    const config = validateEnv({
      USE_MOCK_PROVIDERS: "true",
      LLM_PROVIDER: "mock",
      EMAIL_PROVIDER: "mock",
      INTERNAL_API_SECRET: "internal-secret",
      APP_BASE_URL: "http://localhost:8787"
    });

    expect(config).toMatchObject({
      llmProvider: "mock",
      emailProvider: "mock",
      useMockProviders: true
    });
    expect(config.llmApiKey).toBeUndefined();
    expect(config.emailApiKey).toBeUndefined();
  });

  it("allows missing provider credentials under NODE_ENV=test", () => {
    const config = validateEnv({
      NODE_ENV: "test",
      LLM_PROVIDER: "mock",
      EMAIL_PROVIDER: "mock",
      INTERNAL_API_SECRET: "internal-secret",
      APP_BASE_URL: "http://localhost:8787"
    });

    expect(config.useMockProviders).toBe(true);
  });

  it("reports every missing required real-provider key", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        LLM_PROVIDER: "openai"
      })
    ).toThrow(EnvValidationError);

    try {
      validateEnv({
        NODE_ENV: "production",
        LLM_PROVIDER: "openai"
      });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).issues).toEqual([
        "EMAIL_PROVIDER is required",
        "INTERNAL_API_SECRET is required",
        "APP_BASE_URL is required",
        "SUPABASE_URL is required",
        "SUPABASE_SERVICE_ROLE_KEY is required",
        "LLM_API_KEY is required",
        "EMAIL_API_KEY is required"
      ]);
    }
  });

  it("rejects malformed URLs and boolean flags", () => {
    expect(() =>
      validateEnv({
        USE_MOCK_PROVIDERS: "sometimes",
        LLM_PROVIDER: "mock",
        EMAIL_PROVIDER: "mock",
        INTERNAL_API_SECRET: "internal-secret",
        APP_BASE_URL: "not-a-url"
      })
    ).toThrow(/USE_MOCK_PROVIDERS must be true or false/);
  });
});
