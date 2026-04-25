import { describe, expect, it } from "vitest";

import { createInMemoryRepositories } from "../../src/db/memory";
import { MockEmailProvider } from "../../src/email";
import type { WorkerBindings } from "../../src/env";
import { createApp } from "../../src/http/router";
import { MockLlmProvider } from "../../src/llm";
import {
  fixtureAssistantInput,
  fixtureProfileInput,
  fixtureUserInput
} from "../fixtures/domain";

const env: WorkerBindings = {
  USE_MOCK_PROVIDERS: "true",
  LLM_PROVIDER: "mock",
  EMAIL_PROVIDER: "mock",
  INTERNAL_API_SECRET: "internal-secret",
  APP_BASE_URL: "http://localhost:8787"
};

describe("POST /internal/cron/due-assistants", () => {
  it("rejects requests without the internal secret", async () => {
    const app = createApp({
      repositories: createInMemoryRepositories()
    });

    const response = await app.request(
      "/internal/cron/due-assistants",
      {
        method: "POST"
      },
      env
    );

    expect(response.status).toBe(401);
  });

  it("enqueues only active assistants due at the current schedule time", async () => {
    const repositories = createInMemoryRepositories();
    await repositories.users.create(fixtureUserInput);
    const due = await repositories.assistants.create({
      ...fixtureAssistantInput,
      scheduleCron: "0 8 * * 1"
    });
    await repositories.profiles.create({
      ...fixtureProfileInput,
      assistantId: due.id
    });
    await repositories.assistants.create({
      ...fixtureAssistantInput,
      id: "00000000-0000-4000-8000-000000009999",
      name: "Not Due",
      scheduleCron: "0 9 * * 1"
    });
    const app = createApp({
      repositories,
      llmProvider: new MockLlmProvider(),
      emailProvider: new MockEmailProvider(),
      now: () => new Date("2026-04-27T08:00:00.000Z")
    });

    const response = await app.request(
      "/internal/cron/due-assistants",
      {
        method: "POST",
        headers: {
          "x-internal-api-secret": "internal-secret"
        }
      },
      env
    );
    const body = (await response.json()) as { enqueued: number };

    expect(response.status).toBe(200);
    expect(body.enqueued).toBe(1);
    await expect(repositories.runs.listByAssistant(due.id)).resolves.toHaveLength(1);
  });
});
