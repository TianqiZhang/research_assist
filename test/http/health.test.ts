import { describe, expect, it } from "vitest";

import { createApp } from "../../src/http/router";
import type { WorkerBindings } from "../../src/env";

const testEnv: WorkerBindings = {
  USE_MOCK_PROVIDERS: "true",
  LLM_PROVIDER: "mock",
  EMAIL_PROVIDER: "mock",
  INTERNAL_API_SECRET: "test-secret",
  APP_BASE_URL: "http://localhost:8787"
};

describe("GET /health", () => {
  it("returns the service health payload", async () => {
    const app = createApp();

    const response = await app.request("/health", {}, testEnv);

    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "research-assistant"
    });
    expect(response.status).toBe(200);
  });
});
