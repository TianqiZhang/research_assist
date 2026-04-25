import { describe, expect, it } from "vitest";

import { formatRunTimeline } from "../../src/observability/runTimeline";
import type { AssistantRun, Digest, RunEvent } from "../../src/domain/types";

describe("formatRunTimeline", () => {
  it("summarizes run status, selected papers, email status, and events", () => {
    const timeline = formatRunTimeline({
      run: runFixture(),
      digest: digestFixture(),
      events: [
        eventFixture("load_assistant_config", "info"),
        eventFixture("score_candidates", "error")
      ]
    });

    expect(timeline).toEqual({
      runId: "run-1",
      status: "failed",
      startedAt: "2026-04-25T00:00:00.000Z",
      finishedAt: "2026-04-25T00:01:00.000Z",
      candidateCount: 2,
      selectedPaperIds: ["2604.10001"],
      emailStatus: "failed",
      events: [
        {
          step: "load_assistant_config",
          level: "info",
          message: "load_assistant_config event",
          createdAt: "2026-04-25T00:00:30.000Z"
        },
        {
          step: "score_candidates",
          level: "error",
          message: "score_candidates event",
          createdAt: "2026-04-25T00:00:30.000Z"
        }
      ]
    });
  });
});

function runFixture(): AssistantRun {
  return {
    id: "run-1",
    assistantId: "assistant-1",
    status: "failed",
    triggerType: "manual",
    workflowVersion: "local-workflow-v1",
    startedAt: "2026-04-25T00:00:00.000Z",
    finishedAt: "2026-04-25T00:01:00.000Z",
    createdAt: "2026-04-25T00:00:00.000Z",
    updatedAt: "2026-04-25T00:01:00.000Z"
  };
}

function digestFixture(): Digest {
  return {
    id: "digest-1",
    runId: "run-1",
    assistantId: "assistant-1",
    markdown: "# Digest",
    html: "<h1>Digest</h1>",
    selectedPapers: [
      {
        arxiv_id: "2604.10001",
        rank: 1
      }
    ],
    candidateCount: 2,
    emailStatus: "failed",
    createdAt: "2026-04-25T00:01:00.000Z",
    updatedAt: "2026-04-25T00:01:00.000Z"
  };
}

function eventFixture(step: string, level: RunEvent["level"]): RunEvent {
  return {
    id: `${step}-event`,
    runId: "run-1",
    step,
    level,
    message: `${step} event`,
    details: {},
    createdAt: "2026-04-25T00:00:30.000Z"
  };
}
