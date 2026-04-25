import type { Hono } from "hono";

import { DEV_USER_ID, ensureDevUser } from "../domain/assistants";
import { resolveRepositories } from "./dependencies";
import { jsonError } from "./errors";
import type { AppBindings, AppOptions } from "./types";

export function registerDigestRoutes(app: Hono<AppBindings>, options: AppOptions): void {
  app.get("/digests/:id", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);

    const digest = await repositories.digests.getById(c.req.param("id"));

    if (!digest) {
      return jsonError("not_found", "Digest not found", 404);
    }

    const assistant = await repositories.assistants.getById(digest.assistantId);

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return jsonError("not_found", "Digest not found", 404);
    }

    return c.json({
      digest
    });
  });

  app.get("/assistants/:id/digests", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);

    const assistant = await repositories.assistants.getById(c.req.param("id"));

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return jsonError("not_found", "Assistant not found", 404);
    }

    const digests = await repositories.digests.listByAssistant(assistant.id);

    return c.json({
      digests
    });
  });
}
