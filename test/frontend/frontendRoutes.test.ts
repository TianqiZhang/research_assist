import { describe, expect, it } from "vitest";

import { createInMemoryRepositories } from "../../src/db/memory";
import { MockEmailProvider } from "../../src/email";
import type { WorkerBindings } from "../../src/env";
import { createApp } from "../../src/http/router";
import { MockLlmProvider } from "../../src/llm";
import {
  fixtureAssistantInput,
  fixtureProfileInput,
  fixtureRunInput,
  fixtureUserInput
} from "../fixtures/domain";
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

describe("frontend routes", () => {
  it("renders assistant list empty and non-empty states", async () => {
    const emptyApp = createApp({
      repositories: createInMemoryRepositories()
    });
    const emptyResponse = await emptyApp.request("/app", {}, env);

    expect(await emptyResponse.text()).toContain("No assistants yet");

    const repositories = createInMemoryRepositories();
    await repositories.users.create(fixtureUserInput);
    await repositories.assistants.create(fixtureAssistantInput);
    const app = createApp({ repositories });
    const response = await app.request("/app", {}, env);
    const html = await response.text();

    expect(html).toContain("Agent Papers");
    expect(html).toContain("Run");
  });

  it("validates assistant form submissions", async () => {
    const app = createApp({
      repositories: createInMemoryRepositories(),
      llmProvider: new MockLlmProvider()
    });
    const response = await app.request(
      "/app/assistants",
      {
        method: "POST",
        body: new URLSearchParams({
          name: "Missing Description"
        })
      },
      env
    );
    const html = await response.text();

    expect(response.status).toBe(400);
    expect(html).toContain("Description is required.");
  });

  it("edits an assistant from the UI form", async () => {
    const repositories = createInMemoryRepositories();
    await repositories.users.create(fixtureUserInput);
    await repositories.assistants.create(fixtureAssistantInput);
    await repositories.profiles.create(fixtureProfileInput);
    const app = createApp({
      repositories,
      llmProvider: new MockLlmProvider()
    });

    const response = await app.request(
      `/app/assistants/${fixtureAssistantInput.id}/edit`,
      {
        method: "POST",
        body: new URLSearchParams({
          name: "Edited Agent Papers",
          description: fixtureAssistantInput.description,
          arxiv_categories: "cs.AI, cs.CL",
          timezone: "UTC",
          paper_count: "6",
          is_active: "true"
        })
      },
      env
    );
    const updated = await repositories.assistants.getById(fixtureAssistantInput.id!);

    expect(response.status).toBe(303);
    expect(updated).toMatchObject({
      name: "Edited Agent Papers",
      paperCount: 6,
      isActive: true
    });
  });

  it("manual run form redirects to run status", async () => {
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
      `/app/assistants/${fixtureAssistantInput.id}/runs`,
      {
        method: "POST"
      },
      env
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toMatch(/^\/app\/runs\//);
    await expect(repositories.runs.listByAssistant(fixtureAssistantInput.id!)).resolves.toHaveLength(1);
  });

  it("renders failed run status", async () => {
    const repositories = createInMemoryRepositories();
    await repositories.users.create(fixtureUserInput);
    await repositories.assistants.create(fixtureAssistantInput);
    const run = await repositories.runs.create({
      ...fixtureRunInput,
      status: "failed"
    });
    await repositories.runEvents.append({
      runId: run.id,
      step: "score_candidates",
      level: "error",
      message: "Scoring failed"
    });
    const app = createApp({ repositories });

    const response = await app.request(`/app/runs/${run.id}`, {}, env);
    const html = await response.text();

    expect(html).toContain("failed");
    expect(html).toContain("Scoring failed");
  });

  it("renders digest detail with sanitized saved HTML", async () => {
    const repositories = createInMemoryRepositories();
    await repositories.users.create(fixtureUserInput);
    await repositories.assistants.create(fixtureAssistantInput);
    await repositories.profiles.create(fixtureProfileInput);
    const run = await repositories.runs.create(fixtureRunInput);
    const digest = await repositories.digests.create({
      runId: run.id,
      assistantId: fixtureAssistantInput.id!,
      markdown: "# Safe Digest",
      html: '<h1>Safe Digest</h1><script>alert("x")</script><a href="https://arxiv.org/abs/1" onclick="bad()">Paper</a>',
      selectedPapers: [
        {
          arxiv_id: "2604.10001",
          rank: 1
        }
      ],
      candidateCount: 1,
      emailStatus: "sent"
    });
    const app = createApp({ repositories });

    const response = await app.request(`/app/digests/${digest.id}`, {}, env);
    const html = await response.text();

    expect(html).toContain("Safe Digest");
    expect(html).toContain("Paper");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("onclick");
  });
});
