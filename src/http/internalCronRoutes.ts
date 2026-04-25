import type { Hono } from "hono";

import { DEV_USER_ID, ensureDevUser } from "../domain/assistants";
import { isAssistantDue, runResearchAssistantWorkflow } from "../workflow";
import { hasInternalSecret } from "./auth";
import { resolveEmailProvider, resolveLlmProvider, resolveRepositories } from "./dependencies";
import { jsonError } from "./errors";
import type { AppBindings, AppOptions } from "./types";

export function registerInternalCronRoutes(app: Hono<AppBindings>, options: AppOptions): void {
  app.post("/internal/cron/due-assistants", async (c) => {
    if (
      !hasInternalSecret({
        headerSecret: c.req.header("x-internal-api-secret"),
        authorization: c.req.header("authorization"),
        expectedSecret: c.env.INTERNAL_API_SECRET
      })
    ) {
      return jsonError("unauthorized", "Internal API secret is required", 401);
    }

    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);

    const now = options.now?.() ?? new Date();
    const assistants = await repositories.assistants.listByUser(DEV_USER_ID);
    const due = assistants.filter((assistant) => isAssistantDue(assistant, now));
    const runs = [];

    for (const assistant of due) {
      const run = await repositories.runs.create({
        assistantId: assistant.id,
        status: "queued",
        triggerType: "scheduled",
        requestedByUserId: DEV_USER_ID
      });
      await runResearchAssistantWorkflow(
        {
          runId: run.id,
          assistantId: assistant.id,
          triggerType: "scheduled",
          requestedByUserId: DEV_USER_ID
        },
        {
          repositories,
          llmProvider: resolveLlmProvider(c.env, options),
          emailProvider: resolveEmailProvider(c.env, options),
          now: options.now
        }
      );
      runs.push({
        assistant_id: assistant.id,
        run_id: run.id
      });
    }

    return c.json({
      enqueued: runs.length,
      runs
    });
  });
}
