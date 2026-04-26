import { describe, expect, it } from "vitest";

import { MockEmailProvider } from "../../src/email";
import { resolveEmailProvider, resolveLlmProvider } from "../../src/http/dependencies";
import { MockLlmProvider } from "../../src/llm";

describe("HTTP dependency resolution", () => {
  it("lets USE_MOCK_PROVIDERS force mock providers over concrete provider names", () => {
    const env = {
      USE_MOCK_PROVIDERS: "true",
      LLM_PROVIDER: "azure-openai",
      EMAIL_PROVIDER: "resend",
      INTERNAL_API_SECRET: "internal-secret",
      APP_BASE_URL: "http://localhost:8787"
    };

    expect(resolveLlmProvider(env, {})).toBeInstanceOf(MockLlmProvider);
    expect(resolveEmailProvider(env, {})).toBeInstanceOf(MockEmailProvider);
  });
});
