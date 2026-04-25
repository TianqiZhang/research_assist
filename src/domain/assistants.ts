import type { Repositories } from "../db/repositories";
import type {
  Assistant,
  AssistantProfile,
  CreateAssistantInput,
  UpdateAssistantInput,
  User
} from "./types";
import { compileAssistantProfile } from "../llm/profileCompiler";
import type { LlmProvider } from "../llm/provider";

export const DEV_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEV_USER_EMAIL = "dev@example.com";

export interface AssistantWithProfile {
  assistant: Assistant;
  profile: AssistantProfile | null;
}

export async function ensureDevUser(repositories: Repositories): Promise<User> {
  const existing = await repositories.users.getById(DEV_USER_ID);

  if (existing) {
    return existing;
  }

  return repositories.users.create({
    id: DEV_USER_ID,
    email: DEV_USER_EMAIL,
    displayName: "Local Dev User"
  });
}

export async function createAssistantWithProfile(
  input: CreateAssistantInput,
  dependencies: {
    repositories: Repositories;
    llmProvider: LlmProvider;
  }
): Promise<AssistantWithProfile> {
  const assistant = await dependencies.repositories.assistants.create(input);
  const compiled = await compileAssistantProfile(
    {
      name: assistant.name,
      description: assistant.description,
      arxivCategories: assistant.arxivCategories
    },
    dependencies.llmProvider
  );
  const profile = await dependencies.repositories.profiles.create({
    assistantId: assistant.id,
    promptVersion: compiled.promptVersion,
    profile: compiled.profile,
    rawModelOutput: compiled.rawModelOutput
  });

  return {
    assistant,
    profile
  };
}

export async function updateAssistantWithProfile(
  id: string,
  input: UpdateAssistantInput,
  dependencies: {
    repositories: Repositories;
    llmProvider: LlmProvider;
  }
): Promise<AssistantWithProfile | null> {
  const existing = await dependencies.repositories.assistants.getById(id);

  if (!existing) {
    return null;
  }

  const updated = await dependencies.repositories.assistants.update(id, input);
  const descriptionChanged =
    input.description !== undefined && input.description.trim() !== existing.description.trim();

  if (!descriptionChanged) {
    return {
      assistant: updated,
      profile: await dependencies.repositories.profiles.getLatest(id)
    };
  }

  const compiled = await compileAssistantProfile(
    {
      name: updated.name,
      description: updated.description,
      arxivCategories: updated.arxivCategories
    },
    dependencies.llmProvider
  );
  const profile = await dependencies.repositories.profiles.create({
    assistantId: updated.id,
    promptVersion: compiled.promptVersion,
    profile: compiled.profile,
    rawModelOutput: compiled.rawModelOutput
  });

  return {
    assistant: updated,
    profile
  };
}
