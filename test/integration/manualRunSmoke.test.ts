import { describe, expect, it } from "vitest";

import { MockEmailProvider } from "../../src/email";
import type { WorkerBindings } from "../../src/env";
import { createApp } from "../../src/http/router";
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

describe("mocked manual run smoke", () => {
  it("creates candidates, scores, digest, events, and sent email status", async () => {
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
    const body = (await response.json()) as { run_id: string };
    const [candidates, scores, events, digest] = await Promise.all([
      repositories.candidates.listByRun(body.run_id),
      repositories.scores.listByRun(body.run_id),
      repositories.runEvents.listByRun(body.run_id),
      repositories.digests.getByRunId(body.run_id)
    ]);

    expect(response.status).toBe(202);
    expect(candidates).toHaveLength(2);
    expect(scores).toHaveLength(2);
    expect(digest).toMatchObject({
      emailStatus: "sent",
      candidateCount: 2
    });
    expect(events.map((event) => event.step)).toEqual(
      expect.arrayContaining(["retrieve_candidates", "score_candidates", "save_digest"])
    );
  });
});
