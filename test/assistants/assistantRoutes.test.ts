import { describe, expect, it } from "vitest";

import { createInMemoryRepositories } from "../../src/db/memory";
import type { WorkerBindings } from "../../src/env";
import { createApp } from "../../src/http/router";
import { MockLlmProvider } from "../../src/llm";

const env: WorkerBindings = {
  USE_MOCK_PROVIDERS: "true",
  LLM_PROVIDER: "mock",
  EMAIL_PROVIDER: "mock",
  INTERNAL_API_SECRET: "internal-secret",
  APP_BASE_URL: "http://localhost:8787"
};

const createBody = {
  name: "Agent Papers",
  description: "Find practical papers about AI agents, tool use, RAG, and evaluation.",
  arxiv_categories: ["cs.AI", "cs.CL"],
  schedule_cron: "0 8 * * 1",
  timezone: "America/Los_Angeles",
  paper_count: 5
};

describe("assistant routes", () => {
  it("creates an assistant and compiles the initial profile", async () => {
    const repositories = createInMemoryRepositories();
    const llmProvider = new MockLlmProvider();
    const app = createApp({ repositories, llmProvider });

    const response = await app.request(
      "/assistants",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(createBody)
      },
      env
    );
    const body = (await response.json()) as AssistantRouteResponse;

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      assistant: {
        name: "Agent Papers",
        arxiv_categories: ["cs.AI", "cs.CL"],
        is_active: true
      },
      profile: {
        version: 1,
        prompt_version: "profile-compiler-v1"
      }
    });
    expect(llmProvider.calls).toHaveLength(1);

    const listResponse = await app.request("/assistants", {}, env);
    await expect(listResponse.json()).resolves.toMatchObject({
      assistants: [
        {
          id: body.assistant.id,
          name: "Agent Papers"
        }
      ]
    });
  });

  it("uses mocked local dependencies when no repositories are injected", async () => {
    const app = createApp();

    const response = await app.request(
      "/assistants",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          ...createBody,
          name: "Local Mock Agent"
        })
      },
      env
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      assistant: {
        name: "Local Mock Agent"
      },
      profile: {
        version: 1
      }
    });
  });

  it("creates a new profile version when description changes", async () => {
    const repositories = createInMemoryRepositories();
    const llmProvider = new MockLlmProvider();
    const app = createApp({ repositories, llmProvider });
    const created = await createAssistant(app);

    const response = await app.request(
      `/assistants/${created.assistant.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          description: "Find practical papers about reliable AI agents and evaluation."
        })
      },
      env
    );
    const body = (await response.json()) as AssistantRouteResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      assistant: {
        id: created.assistant.id,
        description: "Find practical papers about reliable AI agents and evaluation."
      },
      profile: {
        version: 2
      }
    });
    expect(llmProvider.calls).toHaveLength(2);
  });

  it("does not create a new profile for non-description updates", async () => {
    const repositories = createInMemoryRepositories();
    const llmProvider = new MockLlmProvider();
    const app = createApp({ repositories, llmProvider });
    const created = await createAssistant(app);

    const response = await app.request(
      `/assistants/${created.assistant.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "Renamed Agent Papers",
          paper_count: 7
        })
      },
      env
    );
    const body = (await response.json()) as AssistantRouteResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      assistant: {
        name: "Renamed Agent Papers",
        paper_count: 7
      },
      profile: {
        version: 1
      }
    });
    expect(llmProvider.calls).toHaveLength(1);
  });

  it("soft-deletes assistants", async () => {
    const repositories = createInMemoryRepositories();
    const app = createApp({
      repositories,
      llmProvider: new MockLlmProvider()
    });
    const created = await createAssistant(app);

    const response = await app.request(
      `/assistants/${created.assistant.id}`,
      {
        method: "DELETE"
      },
      env
    );
    const body = (await response.json()) as AssistantRouteResponse;

    expect(response.status).toBe(200);
    expect(body.assistant.is_active).toBe(false);
  });

  it("rejects invalid create requests", async () => {
    const app = createApp({
      repositories: createInMemoryRepositories(),
      llmProvider: new MockLlmProvider()
    });

    const response = await app.request(
      "/assistants",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "Missing description"
        })
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "bad_request",
        message: "description is required"
      }
    });
  });
});

async function createAssistant(app: ReturnType<typeof createApp>) {
  const response = await app.request(
    "/assistants",
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(createBody)
    },
    env
  );

  return response.json() as Promise<AssistantRouteResponse>;
}

interface AssistantRouteResponse {
  assistant: {
    id: string;
    is_active?: boolean;
  };
  profile?: {
    version: number;
  } | null;
}
