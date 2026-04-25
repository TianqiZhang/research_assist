import { describe, expect, it } from "vitest";

import type { WorkerBindings } from "../../src/env";
import { createApp } from "../../src/http/router";
import { MockEmailProvider } from "../../src/email";
import { MockLlmProvider } from "../../src/llm";
import { fixtureAssistantInput } from "../fixtures/domain";
import {
  createWorkflowRepositories,
  digestResponse,
  qualityResponse,
  scoringResponse
} from "../fixtures/workflow";

const env: WorkerBindings = {
  USE_MOCK_PROVIDERS: "true",
  LLM_PROVIDER: "mock",
  EMAIL_PROVIDER: "mock",
  INTERNAL_API_SECRET: "internal-secret",
  APP_BASE_URL: "http://localhost:8787"
};

describe("run routes", () => {
  it("manual run endpoint creates a queued run and completes it locally", async () => {
    const repositories = await createWorkflowRepositories();
    const app = createApp({
      repositories,
      llmProvider: new MockLlmProvider([
        scoringResponse(["2604.10001", "2604.10002"]),
        digestResponse(),
        qualityResponse(true)
      ]),
      emailProvider: new MockEmailProvider(),
      now: () => new Date("2026-04-25T12:00:00.000Z")
    });

    const response = await app.request(
      `/assistants/${fixtureAssistantInput.id}/runs`,
      {
        method: "POST"
      },
      env
    );
    const body = (await response.json()) as { run_id: string; status: string };

    expect(response.status).toBe(202);
    expect(body.status).toBe("succeeded");

    const statusResponse = await app.request(`/runs/${body.run_id}`, {}, env);
    const status = (await statusResponse.json()) as {
      run: { status: string };
      digest: { email_status: string };
    };

    expect(status.run.status).toBe("succeeded");
    expect(status.digest.email_status).toBe("sent");
  });
});
