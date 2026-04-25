import type { Hono } from "hono";

import { DEV_USER_ID, ensureDevUser } from "../domain/assistants";
import { runResearchAssistantWorkflow } from "../workflow/runWorkflow";
import { resolveEmailProvider, resolveLlmProvider, resolveRepositories } from "./dependencies";
import { jsonError } from "./errors";
import type { AppBindings, AppOptions } from "./types";

export function registerRunRoutes(app: Hono<AppBindings>, options: AppOptions): void {
  app.post("/assistants/:id/runs", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);

    const assistant = await repositories.assistants.getById(c.req.param("id"));

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return jsonError("not_found", "Assistant not found", 404);
    }

    const run = await repositories.runs.create({
      assistantId: assistant.id,
      status: "queued",
      triggerType: "manual",
      requestedByUserId: DEV_USER_ID
    });

    const result = await runResearchAssistantWorkflow(
      {
        runId: run.id,
        assistantId: assistant.id,
        triggerType: "manual",
        requestedByUserId: DEV_USER_ID
      },
      {
        repositories,
        llmProvider: resolveLlmProvider(c.env, options),
        emailProvider: resolveEmailProvider(c.env, options),
        now: options.now
      }
    );

    return c.json(
      {
        run_id: run.id,
        status: result.status
      },
      202
    );
  });

  app.get("/runs/:id", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);

    const run = await repositories.runs.getById(c.req.param("id"));

    if (!run) {
      return jsonError("not_found", "Run not found", 404);
    }

    const assistant = await repositories.assistants.getById(run.assistantId);

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return jsonError("not_found", "Run not found", 404);
    }

    const events = await repositories.runEvents.listByRun(run.id);
    const digest = await repositories.digests.getByRunId(run.id);

    return c.json({
      run: serializeRun(run),
      events: events.map((event) => ({
        id: event.id,
        step: event.step,
        level: event.level,
        message: event.message,
        details: event.details,
        created_at: event.createdAt
      })),
      digest: digest
        ? {
            id: digest.id,
            candidate_count: digest.candidateCount,
            selected_count: digest.selectedPapers.length,
            email_status: digest.emailStatus
          }
        : null
    });
  });

  app.get("/assistants/:id/runs", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);

    const assistant = await repositories.assistants.getById(c.req.param("id"));

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return jsonError("not_found", "Assistant not found", 404);
    }

    const runs = await repositories.runs.listByAssistant(assistant.id);

    return c.json({
      runs: runs.map(serializeRun)
    });
  });
}

function serializeRun(run: {
  id: string;
  assistantId: string;
  status: string;
  triggerType: string;
  requestedByUserId?: string;
  workflowVersion: string;
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}): Record<string, unknown> {
  return {
    id: run.id,
    assistant_id: run.assistantId,
    status: run.status,
    trigger_type: run.triggerType,
    requested_by_user_id: run.requestedByUserId ?? null,
    workflow_version: run.workflowVersion,
    started_at: run.startedAt ?? null,
    finished_at: run.finishedAt ?? null,
    error_code: run.errorCode ?? null,
    error_message: run.errorMessage ?? null,
    created_at: run.createdAt,
    updated_at: run.updatedAt
  };
}
