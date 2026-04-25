import type { Repositories } from "../db/repositories";
import { DEV_USER_EMAIL } from "../domain/assistants";
import { generateCandidates } from "../domain/candidateGeneration";
import { generateAndSaveDigest } from "../domain/digest";
import type { Assistant, AssistantProfile, AssistantRun, Digest, JsonObject } from "../domain/types";
import { compileAssistantProfile } from "../llm/profileCompiler";
import { scoreCandidates } from "../llm/scoring";
import type { LlmProvider } from "../llm/provider";
import type { EmailProvider } from "../domain/providers";
import type { RunTriggerType, RunEventLevel } from "../domain/types";
import { sendDigestEmail } from "../email";

export const WORKFLOW_NAME = "ResearchAssistantRunWorkflow";

export interface ResearchAssistantRunWorkflowInput {
  runId: string;
  assistantId: string;
  triggerType: RunTriggerType;
  requestedByUserId?: string;
}

export interface ResearchAssistantRunWorkflowDependencies {
  repositories: Repositories;
  llmProvider: LlmProvider;
  emailProvider: EmailProvider;
  now?: () => Date;
}

export async function runResearchAssistantWorkflow(
  input: ResearchAssistantRunWorkflowInput,
  dependencies: ResearchAssistantRunWorkflowDependencies
): Promise<AssistantRun> {
  const now = dependencies.now ?? (() => new Date());
  let currentStep = "start";

  await dependencies.repositories.runs.updateStatus({
    runId: input.runId,
    status: "running",
    startedAt: now().toISOString()
  });

  try {
    currentStep = "load_assistant_config";
    const assistant = await loadAssistant(input.assistantId, dependencies.repositories);
    await event(dependencies, input.runId, currentStep, "Loaded assistant config", {
      assistant_id: assistant.id
    });

    currentStep = "compile_or_load_profile";
    const profile = await compileOrLoadProfile(assistant, dependencies);
    await event(dependencies, input.runId, currentStep, "Loaded assistant profile", {
      profile_version: profile.version,
      prompt_version: profile.promptVersion
    });

    currentStep = "retrieve_candidates";
    const window = manualRunWindow(now());
    const candidates = await generateCandidates(
      {
        runId: input.runId,
        assistantId: assistant.id,
        profileVersion: profile.version,
        categories: assistant.arxivCategories,
        fromDate: window.fromDate,
        toDate: window.toDate
      },
      dependencies
    );
    await event(dependencies, input.runId, currentStep, "Retrieved candidates", {
      candidate_count: candidates.length,
      from_date: window.fromDate,
      to_date: window.toDate
    });

    currentStep = "score_candidates";
    const scores = await scoreCandidates(
      {
        runId: input.runId,
        assistantId: assistant.id,
        profileVersion: profile.version
      },
      dependencies
    );
    await event(dependencies, input.runId, currentStep, "Scored candidates", {
      scored_count: scores.length
    });

    currentStep = "rank_and_diversify";
    await event(dependencies, input.runId, currentStep, "Ranking selected papers");

    currentStep = "generate_digest";
    await event(dependencies, input.runId, currentStep, "Generating digest");

    currentStep = "quality_check";
    await event(dependencies, input.runId, currentStep, "Running quality check");

    currentStep = "save_digest";
    const digest = await generateAndSaveDigest(
      {
        runId: input.runId,
        assistantId: assistant.id,
        paperCount: assistant.paperCount
      },
      dependencies
    );
    await event(dependencies, input.runId, currentStep, "Saved digest", {
      digest_id: digest.id,
      selected_count: digest.selectedPapers.length
    });

    currentStep = "send_email";
    await sendDigestIfNeeded(assistant, digest, dependencies, now());

    currentStep = "finish_run";
    await event(dependencies, input.runId, currentStep, "Finished run", {
      workflow: WORKFLOW_NAME
    });

    return dependencies.repositories.runs.updateStatus({
      runId: input.runId,
      status: "succeeded",
      finishedAt: now().toISOString()
    });
  } catch (error) {
    await event(
      dependencies,
      input.runId,
      currentStep,
      `Workflow failed during ${currentStep}`,
      {
        error: error instanceof Error ? error.message : "Unknown error"
      },
      "error"
    );

    return dependencies.repositories.runs.updateStatus({
      runId: input.runId,
      status: "failed",
      finishedAt: now().toISOString(),
      errorCode: "WORKFLOW_FAILED",
      errorMessage: `Workflow failed during ${currentStep}`
    });
  }
}

async function loadAssistant(assistantId: string, repositories: Repositories): Promise<Assistant> {
  const assistant = await repositories.assistants.getById(assistantId);

  if (!assistant || !assistant.isActive) {
    throw new Error("Assistant not found or inactive");
  }

  return assistant;
}

async function compileOrLoadProfile(
  assistant: Assistant,
  dependencies: ResearchAssistantRunWorkflowDependencies
): Promise<AssistantProfile> {
  const existing = await dependencies.repositories.profiles.getLatest(assistant.id);

  if (existing) {
    return existing;
  }

  const compiled = await compileAssistantProfile(
    {
      name: assistant.name,
      description: assistant.description,
      arxivCategories: assistant.arxivCategories
    },
    dependencies.llmProvider
  );

  return dependencies.repositories.profiles.create({
    assistantId: assistant.id,
    promptVersion: compiled.promptVersion,
    profile: compiled.profile,
    rawModelOutput: compiled.rawModelOutput
  });
}

async function sendDigestIfNeeded(
  assistant: Assistant,
  digest: Digest,
  dependencies: ResearchAssistantRunWorkflowDependencies,
  now: Date
): Promise<void> {
  if (digest.selectedPapers.length === 0) {
    await dependencies.repositories.digests.updateEmailStatus({
      digestId: digest.id,
      emailStatus: "skipped"
    });
    await event(dependencies, digest.runId, "send_email", "Skipped email for empty digest", {
      digest_id: digest.id
    });
    return;
  }

  try {
    const result = await sendDigestEmail(
      {
        digestId: digest.id,
        to: DEV_USER_EMAIL,
        subject: `${assistant.name}: ${digest.selectedPapers.length} new papers for ${dateOnly(now)}`,
        html: digest.html,
        text: digest.markdown
      },
      dependencies.emailProvider
    );
    await dependencies.repositories.digests.updateEmailStatus({
      digestId: digest.id,
      emailStatus: "sent",
      emailProviderMessageId: result.providerMessageId
    });
    await event(dependencies, digest.runId, "send_email", "Sent digest email", {
      digest_id: digest.id,
      provider_message_id: result.providerMessageId
    });
  } catch (error) {
    await dependencies.repositories.digests.updateEmailStatus({
      digestId: digest.id,
      emailStatus: "failed"
    });
    await event(
      dependencies,
      digest.runId,
      "send_email",
      "Email delivery failed; digest remains saved",
      {
        digest_id: digest.id,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      "warn"
    );
  }
}

async function event(
  dependencies: ResearchAssistantRunWorkflowDependencies,
  runId: string,
  step: string,
  message: string,
  details: JsonObject = {},
  level: RunEventLevel = "info"
): Promise<void> {
  await dependencies.repositories.runEvents.append({
    runId,
    step,
    level,
    message,
    details
  });
}

function manualRunWindow(now: Date): { fromDate: string; toDate: string } {
  const to = dateOnly(now);
  const fromDate = new Date(now);
  fromDate.setUTCDate(fromDate.getUTCDate() - 7);

  return {
    fromDate: dateOnly(fromDate),
    toDate: to
  };
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
