export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

export const DEFAULT_ARXIV_CATEGORIES = ["cs.AI", "cs.CL", "cs.LG"] as const;
export const DEFAULT_WORKFLOW_VERSION = "local-workflow-v1";

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";
export type RunTriggerType = "manual" | "scheduled" | "internal";
export type RunEventLevel = "info" | "warn" | "error";
export type EmailStatus = "not_sent" | "sent" | "failed" | "skipped";

export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  id?: string;
  email: string;
  displayName?: string;
}

export interface Assistant {
  id: string;
  userId: string;
  name: string;
  description: string;
  arxivCategories: string[];
  scheduleCron?: string;
  timezone: string;
  paperCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssistantInput {
  id?: string;
  userId: string;
  name: string;
  description: string;
  arxivCategories?: string[];
  scheduleCron?: string;
  timezone?: string;
  paperCount?: number;
  isActive?: boolean;
}

export interface UpdateAssistantInput {
  name?: string;
  description?: string;
  arxivCategories?: string[];
  scheduleCron?: string | null;
  timezone?: string;
  paperCount?: number;
  isActive?: boolean;
}

export interface AssistantProfile {
  id: string;
  assistantId: string;
  version: number;
  promptVersion: string;
  profile: JsonObject;
  rawModelOutput: JsonValue;
  createdAt: string;
}

export interface CreateAssistantProfileInput {
  id?: string;
  assistantId: string;
  version?: number;
  promptVersion: string;
  profile: JsonObject;
  rawModelOutput: JsonValue;
}

export interface ArxivPaper {
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  categories: string[];
  primaryCategory?: string;
  publishedAt: string;
  updatedAt?: string;
  pdfUrl?: string;
  absUrl: string;
  metadata: JsonObject;
  createdAt?: string;
}

export interface SearchRecentPapersInput {
  categories: string[];
  fromDate: string;
  toDate: string;
  limit?: number;
}

export interface AssistantRun {
  id: string;
  assistantId: string;
  profileId?: string;
  status: RunStatus;
  triggerType: RunTriggerType;
  requestedByUserId?: string;
  workflowVersion: string;
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssistantRunInput {
  id?: string;
  assistantId: string;
  profileId?: string;
  status?: RunStatus;
  triggerType: RunTriggerType;
  requestedByUserId?: string;
  workflowVersion?: string;
}

export interface UpdateRunStatusInput {
  runId: string;
  status: RunStatus;
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface RunEvent {
  id: string;
  runId: string;
  step: string;
  level: RunEventLevel;
  message: string;
  details: JsonObject;
  createdAt: string;
}

export interface AppendRunEventInput {
  id?: string;
  runId: string;
  step: string;
  level?: RunEventLevel;
  message: string;
  details?: JsonObject;
}

export interface RunCandidate {
  id: string;
  runId: string;
  arxivId: string;
  candidateRank: number;
  cheapScore: number;
  candidateReason: string;
  source: JsonObject;
  createdAt: string;
}

export interface InsertRunCandidateInput {
  id?: string;
  arxivId: string;
  candidateRank: number;
  cheapScore: number;
  candidateReason: string;
  source?: JsonObject;
}

export interface RunScore {
  id: string;
  runId: string;
  arxivId: string;
  promptVersion: string;
  topicRelevance: number;
  technicalQuality: number;
  practicalValue: number;
  novelty: number;
  finalScore: number;
  shouldInclude: boolean;
  reason: string;
  rawModelOutput: JsonValue;
  model?: string;
  createdAt: string;
}

export interface InsertRunScoreInput {
  id?: string;
  arxivId: string;
  promptVersion: string;
  topicRelevance: number;
  technicalQuality: number;
  practicalValue: number;
  novelty: number;
  finalScore: number;
  shouldInclude: boolean;
  reason: string;
  rawModelOutput: JsonValue;
  model?: string;
}

export interface Digest {
  id: string;
  runId: string;
  assistantId: string;
  markdown: string;
  html: string;
  selectedPapers: JsonValue[];
  candidateCount: number;
  qualityCheck?: JsonValue;
  digestPromptVersion?: string;
  qualityPromptVersion?: string;
  rawDigestOutput?: JsonValue;
  rawQualityOutput?: JsonValue;
  emailStatus: EmailStatus;
  emailProviderMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDigestInput {
  id?: string;
  runId: string;
  assistantId: string;
  markdown: string;
  html: string;
  selectedPapers?: JsonValue[];
  candidateCount: number;
  qualityCheck?: JsonValue;
  digestPromptVersion?: string;
  qualityPromptVersion?: string;
  rawDigestOutput?: JsonValue;
  rawQualityOutput?: JsonValue;
  emailStatus?: EmailStatus;
  emailProviderMessageId?: string;
}

export interface UpdateDigestEmailStatusInput {
  digestId: string;
  emailStatus: EmailStatus;
  emailProviderMessageId?: string;
}
