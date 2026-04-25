import type { Hono } from "hono";

import {
  DEV_USER_ID,
  createAssistantWithProfile,
  ensureDevUser,
  updateAssistantWithProfile
} from "../domain/assistants";
import type {
  Assistant,
  AssistantProfile,
  CreateAssistantInput,
  UpdateAssistantInput
} from "../domain/types";
import { DEFAULT_ARXIV_CATEGORIES } from "../domain/types";
import { resolveLlmProvider, resolveRepositories } from "./dependencies";
import { jsonError } from "./errors";
import type { AppBindings, AppOptions } from "./types";

interface CreateAssistantBody {
  name?: unknown;
  description?: unknown;
  arxiv_categories?: unknown;
  schedule_cron?: unknown;
  timezone?: unknown;
  paper_count?: unknown;
}

interface UpdateAssistantBody extends CreateAssistantBody {
  is_active?: unknown;
}

export function registerAssistantRoutes(app: Hono<AppBindings>, options: AppOptions): void {
  app.get("/assistants", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);

    const assistants = await repositories.assistants.listByUser(DEV_USER_ID);
    return c.json({
      assistants: assistants.map(serializeAssistant)
    });
  });

  app.get("/assistants/:id", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);

    const assistant = await repositories.assistants.getById(c.req.param("id"));

    if (!assistant || assistant.userId !== DEV_USER_ID) {
      return jsonError("not_found", "Assistant not found", 404);
    }

    const profile = await repositories.profiles.getLatest(assistant.id);
    return c.json(serializeAssistantWithProfile(assistant, profile));
  });

  app.post("/assistants", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);

    const parsed = await parseJsonBody<CreateAssistantBody>(c.req.raw);

    if ("error" in parsed) {
      return jsonError("bad_request", parsed.error, 400);
    }

    const input = parseCreateAssistantBody(parsed.body);

    if ("error" in input) {
      return jsonError("bad_request", input.error, 400);
    }

    const result = await createAssistantWithProfile(input.value, {
      repositories,
      llmProvider: resolveLlmProvider(c.env, options)
    });

    return c.json(serializeAssistantWithProfile(result.assistant, result.profile), 201);
  });

  app.patch("/assistants/:id", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);

    const existing = await repositories.assistants.getById(c.req.param("id"));

    if (!existing || existing.userId !== DEV_USER_ID) {
      return jsonError("not_found", "Assistant not found", 404);
    }

    const parsed = await parseJsonBody<UpdateAssistantBody>(c.req.raw);

    if ("error" in parsed) {
      return jsonError("bad_request", parsed.error, 400);
    }

    const input = parseUpdateAssistantBody(parsed.body);

    if ("error" in input) {
      return jsonError("bad_request", input.error, 400);
    }

    const result = await updateAssistantWithProfile(existing.id, input.value, {
      repositories,
      llmProvider: resolveLlmProvider(c.env, options)
    });

    if (!result) {
      return jsonError("not_found", "Assistant not found", 404);
    }

    return c.json(serializeAssistantWithProfile(result.assistant, result.profile));
  });

  app.delete("/assistants/:id", async (c) => {
    const repositories = resolveRepositories(c.env, options);
    await ensureDevUser(repositories);

    const existing = await repositories.assistants.getById(c.req.param("id"));

    if (!existing || existing.userId !== DEV_USER_ID) {
      return jsonError("not_found", "Assistant not found", 404);
    }

    const assistant = await repositories.assistants.update(existing.id, {
      isActive: false
    });
    const profile = await repositories.profiles.getLatest(existing.id);

    return c.json(serializeAssistantWithProfile(assistant, profile));
  });
}

function parseCreateAssistantBody(
  body: CreateAssistantBody
): { value: CreateAssistantInput } | { error: string } {
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return { error: "name is required" };
  }

  if (typeof body.description !== "string" || body.description.trim().length === 0) {
    return { error: "description is required" };
  }

  const shared = parseSharedAssistantFields(body, true);

  if ("error" in shared) {
    return shared;
  }

  return {
    value: {
      userId: DEV_USER_ID,
      name: body.name.trim(),
      description: body.description.trim(),
      ...shared.value
    }
  };
}

function parseUpdateAssistantBody(
  body: UpdateAssistantBody
): { value: UpdateAssistantInput } | { error: string } {
  const shared = parseSharedAssistantFields(body, false);

  if ("error" in shared) {
    return shared;
  }

  const value: UpdateAssistantInput = {
    ...shared.value
  };

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return { error: "name must be a non-empty string when set" };
    }

    value.name = body.name.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.trim().length === 0) {
      return { error: "description must be a non-empty string when set" };
    }

    value.description = body.description.trim();
  }

  if (body.is_active !== undefined) {
    if (typeof body.is_active !== "boolean") {
      return { error: "is_active must be a boolean when set" };
    }

    value.isActive = body.is_active;
  }

  return { value };
}

function parseSharedAssistantFields(
  body: CreateAssistantBody,
  includeDefaults: boolean
):
  | {
      value: Omit<CreateAssistantInput, "userId" | "name" | "description">;
    }
  | { error: string } {
  const value: Omit<CreateAssistantInput, "userId" | "name" | "description"> = {};

  if (body.arxiv_categories !== undefined) {
    if (
      !Array.isArray(body.arxiv_categories) ||
      body.arxiv_categories.some((category) => typeof category !== "string")
    ) {
      return { error: "arxiv_categories must be an array of strings when set" };
    }

    value.arxivCategories = body.arxiv_categories.map((category) => category.trim()).filter(Boolean);
  } else if (includeDefaults) {
    value.arxivCategories = [...DEFAULT_ARXIV_CATEGORIES];
  }

  if (body.schedule_cron !== undefined) {
    if (body.schedule_cron !== null && typeof body.schedule_cron !== "string") {
      return { error: "schedule_cron must be a string or null when set" };
    }

    value.scheduleCron = body.schedule_cron ?? undefined;
  }

  if (body.timezone !== undefined) {
    if (typeof body.timezone !== "string" || body.timezone.trim().length === 0) {
      return { error: "timezone must be a non-empty string when set" };
    }

    value.timezone = body.timezone.trim();
  }

  if (body.paper_count !== undefined) {
    if (
      typeof body.paper_count !== "number" ||
      !Number.isInteger(body.paper_count) ||
      body.paper_count < 1 ||
      body.paper_count > 20
    ) {
      return { error: "paper_count must be an integer between 1 and 20 when set" };
    }

    value.paperCount = body.paper_count;
  }

  return { value };
}

async function parseJsonBody<T>(request: Request): Promise<{ body: T } | { error: string }> {
  try {
    return {
      body: (await request.json()) as T
    };
  } catch {
    return {
      error: "Request body must be valid JSON"
    };
  }
}

function serializeAssistantWithProfile(
  assistant: Assistant,
  profile: AssistantProfile | null
): Record<string, unknown> {
  return {
    assistant: serializeAssistant(assistant),
    profile: profile ? serializeProfileMetadata(profile) : null
  };
}

function serializeAssistant(assistant: Assistant): Record<string, unknown> {
  return {
    id: assistant.id,
    user_id: assistant.userId,
    name: assistant.name,
    description: assistant.description,
    arxiv_categories: assistant.arxivCategories,
    schedule_cron: assistant.scheduleCron ?? null,
    timezone: assistant.timezone,
    paper_count: assistant.paperCount,
    is_active: assistant.isActive,
    created_at: assistant.createdAt,
    updated_at: assistant.updatedAt
  };
}

function serializeProfileMetadata(profile: AssistantProfile): Record<string, unknown> {
  return {
    id: profile.id,
    assistant_id: profile.assistantId,
    version: profile.version,
    prompt_version: profile.promptVersion,
    created_at: profile.createdAt
  };
}
