import { describe, expect, it } from "vitest";

import { EnvValidationError, validateEnv } from "../src/env";

describe("validateEnv", () => {
  it("accepts a complete real-provider configuration", () => {
    const config = validateEnv({
      NODE_ENV: "production",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "supabase-secret",
      LLM_PROVIDER: "azure-openai",
      AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
      AZURE_OPENAI_API_KEY: "azure-secret",
      AZURE_OPENAI_DEPLOYMENT: "research-gpt",
      AZURE_OPENAI_API_VERSION: "2024-10-21",
      EMAIL_PROVIDER: "resend",
      EMAIL_API_KEY: "email-secret",
      INTERNAL_API_SECRET: "internal-secret",
      APP_BASE_URL: "https://research.example.com"
    });

    expect(config).toMatchObject({
      supabaseUrl: "https://example.supabase.co",
      llmProvider: "azure-openai",
      azureOpenAiEndpoint: "https://example.openai.azure.com",
      azureOpenAiDeployment: "research-gpt",
      emailProvider: "resend",
      appBaseUrl: "https://research.example.com",
      useMockProviders: false
    });
  });

  it("allows Azure OpenAI with mock email", () => {
    const config = validateEnv({
      NODE_ENV: "production",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "supabase-secret",
      LLM_PROVIDER: "azure-openai",
      AZURE_OPENAI_ENDPOINT: "https://example.openai.azure.com",
      AZURE_OPENAI_API_KEY: "azure-secret",
      AZURE_OPENAI_DEPLOYMENT: "research-gpt",
      AZURE_OPENAI_API_VERSION: "2024-10-21",
      EMAIL_PROVIDER: "mock",
      INTERNAL_API_SECRET: "internal-secret",
      APP_BASE_URL: "https://research.example.com"
    });

    expect(config).toMatchObject({
      llmProvider: "azure-openai",
      emailProvider: "mock",
      emailApiKey: undefined
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

  it("does not require real provider credentials when mock providers are enabled", () => {
    const config = validateEnv({
      USE_MOCK_PROVIDERS: "true",
      LLM_PROVIDER: "azure-openai",
      EMAIL_PROVIDER: "resend",
      INTERNAL_API_SECRET: "internal-secret",
      APP_BASE_URL: "http://localhost:8787"
    });

    expect(config).toMatchObject({
      llmProvider: "azure-openai",
      emailProvider: "resend",
      useMockProviders: true
    });
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
        LLM_PROVIDER: "azure-openai"
      });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).issues).toEqual([
        "EMAIL_PROVIDER is required",
        "INTERNAL_API_SECRET is required",
        "APP_BASE_URL is required",
        "SUPABASE_URL is required",
        "SUPABASE_SERVICE_ROLE_KEY is required",
        "AZURE_OPENAI_ENDPOINT is required",
        "AZURE_OPENAI_API_KEY is required",
        "AZURE_OPENAI_DEPLOYMENT is required",
        "AZURE_OPENAI_API_VERSION is required"
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
