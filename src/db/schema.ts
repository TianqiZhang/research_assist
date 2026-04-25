import type {
  ArxivPaper,
  Assistant,
  AssistantProfile,
  AssistantRun,
  Digest,
  JsonObject,
  JsonValue,
  RunCandidate,
  RunEvent,
  RunScore,
  User
} from "../domain/types";

export interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssistantRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  arxiv_categories: string[];
  schedule_cron: string | null;
  timezone: string;
  paper_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssistantProfileRow {
  id: string;
  assistant_id: string;
  version: number;
  prompt_version: string;
  profile_json: JsonObject;
  raw_model_output: JsonValue;
  created_at: string;
}

export interface ArxivPaperRow {
  arxiv_id: string;
  title: string;
  abstract: string;
  authors: string[];
  categories: string[];
  primary_category: string | null;
  published_at: string;
  updated_at: string | null;
  pdf_url: string | null;
  abs_url: string;
  metadata: JsonObject;
  created_at: string;
  cached_at: string;
}

export interface AssistantRunRow {
  id: string;
  assistant_id: string;
  profile_id: string | null;
  status: AssistantRun["status"];
  trigger_type: AssistantRun["triggerType"];
  requested_by_user_id: string | null;
  workflow_version: string;
  started_at: string | null;
  finished_at: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface RunEventRow {
  id: string;
  run_id: string;
  step: string;
  level: RunEvent["level"];
  message: string;
  details: JsonObject;
  created_at: string;
}

export interface RunCandidateRow {
  id: string;
  run_id: string;
  arxiv_id: string;
  candidate_rank: number;
  cheap_score: number | string;
  candidate_reason: string;
  source: JsonObject;
  created_at: string;
}

export interface RunScoreRow {
  id: string;
  run_id: string;
  arxiv_id: string;
  prompt_version: string;
  topic_relevance: number;
  technical_quality: number;
  practical_value: number;
  novelty: number;
  final_score: number | string;
  should_include: boolean;
  reason: string;
  raw_model_output: JsonValue;
  model: string | null;
  created_at: string;
}

export interface DigestRow {
  id: string;
  run_id: string;
  assistant_id: string;
  markdown: string;
  html: string;
  selected_papers: JsonValue[];
  candidate_count: number;
  quality_check: JsonValue | null;
  digest_prompt_version: string | null;
  quality_prompt_version: string | null;
  raw_digest_output: JsonValue | null;
  raw_quality_output: JsonValue | null;
  email_status: Digest["emailStatus"];
  email_provider_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export function userFromRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function assistantFromRow(row: AssistantRow): Assistant {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    arxivCategories: row.arxiv_categories,
    scheduleCron: row.schedule_cron ?? undefined,
    timezone: row.timezone,
    paperCount: row.paper_count,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function assistantProfileFromRow(row: AssistantProfileRow): AssistantProfile {
  return {
    id: row.id,
    assistantId: row.assistant_id,
    version: row.version,
    promptVersion: row.prompt_version,
    profile: row.profile_json,
    rawModelOutput: row.raw_model_output,
    createdAt: row.created_at
  };
}

export function arxivPaperFromRow(row: ArxivPaperRow): ArxivPaper {
  return {
    arxivId: row.arxiv_id,
    title: row.title,
    abstract: row.abstract,
    authors: row.authors,
    categories: row.categories,
    primaryCategory: row.primary_category ?? undefined,
    publishedAt: row.published_at,
    updatedAt: row.updated_at ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
    absUrl: row.abs_url,
    metadata: row.metadata,
    createdAt: row.created_at
  };
}

export function assistantRunFromRow(row: AssistantRunRow): AssistantRun {
  return {
    id: row.id,
    assistantId: row.assistant_id,
    profileId: row.profile_id ?? undefined,
    status: row.status,
    triggerType: row.trigger_type,
    requestedByUserId: row.requested_by_user_id ?? undefined,
    workflowVersion: row.workflow_version,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function runEventFromRow(row: RunEventRow): RunEvent {
  return {
    id: row.id,
    runId: row.run_id,
    step: row.step,
    level: row.level,
    message: row.message,
    details: row.details,
    createdAt: row.created_at
  };
}

export function runCandidateFromRow(row: RunCandidateRow): RunCandidate {
  return {
    id: row.id,
    runId: row.run_id,
    arxivId: row.arxiv_id,
    candidateRank: row.candidate_rank,
    cheapScore: Number(row.cheap_score),
    candidateReason: row.candidate_reason,
    source: row.source,
    createdAt: row.created_at
  };
}

export function runScoreFromRow(row: RunScoreRow): RunScore {
  return {
    id: row.id,
    runId: row.run_id,
    arxivId: row.arxiv_id,
    promptVersion: row.prompt_version,
    topicRelevance: row.topic_relevance,
    technicalQuality: row.technical_quality,
    practicalValue: row.practical_value,
    novelty: row.novelty,
    finalScore: Number(row.final_score),
    shouldInclude: row.should_include,
    reason: row.reason,
    rawModelOutput: row.raw_model_output,
    model: row.model ?? undefined,
    createdAt: row.created_at
  };
}

export function digestFromRow(row: DigestRow): Digest {
  return {
    id: row.id,
    runId: row.run_id,
    assistantId: row.assistant_id,
    markdown: row.markdown,
    html: row.html,
    selectedPapers: row.selected_papers,
    candidateCount: row.candidate_count,
    qualityCheck: row.quality_check ?? undefined,
    digestPromptVersion: row.digest_prompt_version ?? undefined,
    qualityPromptVersion: row.quality_prompt_version ?? undefined,
    rawDigestOutput: row.raw_digest_output ?? undefined,
    rawQualityOutput: row.raw_quality_output ?? undefined,
    emailStatus: row.email_status,
    emailProviderMessageId: row.email_provider_message_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
