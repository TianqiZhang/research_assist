import { describe, expect, it } from "vitest";

import { createInMemoryRepositories } from "../../src/db/memory";
import type { WorkerBindings } from "../../src/env";
import { createApp } from "../../src/http/router";
import { fixtureAssistantInput, fixtureRunInput, fixtureUserInput } from "../fixtures/domain";

const env: WorkerBindings = {
  USE_MOCK_PROVIDERS: "true",
  LLM_PROVIDER: "mock",
  EMAIL_PROVIDER: "mock",
  INTERNAL_API_SECRET: "internal-secret",
  APP_BASE_URL: "http://localhost:8787"
};

describe("ownership enforcement", () => {
  it("does not expose another user's assistant", async () => {
    const repositories = createInMemoryRepositories();
    await repositories.users.create(fixtureUserInput);
    await repositories.users.create({
      id: "00000000-0000-4000-8000-000000009001",
      email: "other@example.com"
    });
    const assistant = await repositories.assistants.create({
      ...fixtureAssistantInput,
      id: "00000000-0000-4000-8000-000000009002",
      userId: "00000000-0000-4000-8000-000000009001"
    });
    const app = createApp({ repositories });

    const response = await app.request(`/assistants/${assistant.id}`, {}, env);

    expect(response.status).toBe(404);
  });

  it("does not expose another user's digest", async () => {
    const repositories = createInMemoryRepositories();
    await repositories.users.create(fixtureUserInput);
    await repositories.users.create({
      id: "00000000-0000-4000-8000-000000009003",
      email: "other-digest@example.com"
    });
    const assistant = await repositories.assistants.create({
      ...fixtureAssistantInput,
      id: "00000000-0000-4000-8000-000000009004",
      userId: "00000000-0000-4000-8000-000000009003"
    });
    const run = await repositories.runs.create({
      ...fixtureRunInput,
      id: "00000000-0000-4000-8000-000000009005",
      assistantId: assistant.id
    });
    const digest = await repositories.digests.create({
      runId: run.id,
      assistantId: assistant.id,
      markdown: "# Private",
      html: "<h1>Private</h1>",
      candidateCount: 0
    });
    const app = createApp({ repositories });

    const response = await app.request(`/digests/${digest.id}`, {}, env);

    expect(response.status).toBe(404);
  });

  it("rejects wrong internal secrets", async () => {
    const app = createApp({
      repositories: createInMemoryRepositories()
    });

    const response = await app.request(
      "/internal/cron/due-assistants",
      {
        method: "POST",
        headers: {
          "x-internal-api-secret": "wrong"
        }
      },
      env
    );

    expect(response.status).toBe(401);
  });
});
