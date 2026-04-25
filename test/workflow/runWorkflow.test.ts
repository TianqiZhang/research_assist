import { describe, expect, it } from "vitest";

import { createInMemoryRepositories } from "../../src/db/memory";
import { MockEmailProvider } from "../../src/email";
import { runResearchAssistantWorkflow } from "../../src/workflow";
import { MockLlmProvider } from "../../src/llm";
import {
  fixtureAssistantInput,
  fixtureRunInput,
  fixtureUserInput
} from "../fixtures/domain";
import {
  createWorkflowRepositories,
  digestResponse,
  qualityResponse,
  scoringResponse
} from "../fixtures/workflow";

const now = () => new Date("2026-04-25T12:00:00.000Z");

describe("runResearchAssistantWorkflow", () => {
  it("runs steps in order and sends digest email with mocks", async () => {
    const repositories = await createWorkflowRepositories();
    const run = await repositories.runs.create(fixtureRunInput);
    const emailProvider = new MockEmailProvider();
    const llmProvider = new MockLlmProvider([
      scoringResponse(["2604.10001", "2604.10002"]),
      digestResponse(),
      qualityResponse(true)
    ]);

    const result = await runResearchAssistantWorkflow(
      {
        runId: run.id,
        assistantId: fixtureAssistantInput.id!,
        triggerType: "manual",
        requestedByUserId: fixtureUserInput.id
      },
      {
        repositories,
        llmProvider,
        emailProvider,
        now
      }
    );
    const events = await repositories.runEvents.listByRun(run.id);
    const digest = await repositories.digests.getByRunId(run.id);

    expect(result.status).toBe("succeeded");
    expect(events.map((event) => event.step)).toEqual([
      "load_assistant_config",
      "compile_or_load_profile",
      "retrieve_candidates",
      "score_candidates",
      "rank_and_diversify",
      "generate_digest",
      "quality_check",
      "save_digest",
      "send_email",
      "finish_run"
    ]);
    expect(digest?.emailStatus).toBe("sent");
    expect(emailProvider.sent).toHaveLength(1);
  });

  it("marks the run failed and writes an event when a step fails", async () => {
    const repositories = createInMemoryRepositories();
    await repositories.users.create(fixtureUserInput);
    await repositories.assistants.create({
      ...fixtureAssistantInput,
      isActive: false
    });
    const run = await repositories.runs.create(fixtureRunInput);

    const result = await runResearchAssistantWorkflow(
      {
        runId: run.id,
        assistantId: fixtureAssistantInput.id!,
        triggerType: "manual"
      },
      {
        repositories,
        llmProvider: new MockLlmProvider(),
        emailProvider: new MockEmailProvider(),
        now
      }
    );
    const events = await repositories.runEvents.listByRun(run.id);

    expect(result).toMatchObject({
      status: "failed",
      errorCode: "WORKFLOW_FAILED",
      errorMessage: "Workflow failed during load_assistant_config"
    });
    expect(events).toMatchObject([
      {
        step: "load_assistant_config",
        level: "error"
      }
    ]);
  });

  it("keeps digest saved when email sending fails", async () => {
    const repositories = await createWorkflowRepositories();
    const run = await repositories.runs.create(fixtureRunInput);
    const llmProvider = new MockLlmProvider([
      scoringResponse(["2604.10001", "2604.10002"]),
      digestResponse(),
      qualityResponse(true)
    ]);

    const result = await runResearchAssistantWorkflow(
      {
        runId: run.id,
        assistantId: fixtureAssistantInput.id!,
        triggerType: "manual"
      },
      {
        repositories,
        llmProvider,
        emailProvider: new MockEmailProvider({ fail: true }),
        now
      }
    );
    const digest = await repositories.digests.getByRunId(run.id);
    const events = await repositories.runEvents.listByRun(run.id);

    expect(result.status).toBe("succeeded");
    expect(digest?.emailStatus).toBe("failed");
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          step: "send_email",
          level: "warn"
        })
      ])
    );
  });
});
