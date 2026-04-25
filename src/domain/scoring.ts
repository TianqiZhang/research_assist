import type { JsonValue } from "./types";
import { isRecord } from "../utils";

export interface ScoreCandidatesInput {
  runId: string;
  assistantId: string;
  profileVersion: number;
  batchSize?: number;
}

export interface CandidateScoreOutput {
  arxivId: string;
  topicRelevance: number;
  technicalQuality: number;
  practicalValue: number;
  novelty: number;
  finalScore: number;
  shouldInclude: boolean;
  reason: string;
  rawModelOutput: JsonValue;
  model: string;
}

export interface CandidateScoringLlmScore {
  arxiv_id: string;
  topic_relevance: number;
  technical_quality: number;
  practical_value: number;
  novelty: number;
  final_score: number;
  should_include: boolean;
  reason: string;
}

export interface CandidateScoringLlmOutput {
  scores: CandidateScoringLlmScore[];
}

export class CandidateScoringValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidateScoringValidationError";
  }
}

export function validateCandidateScoringOutput(
  output: unknown,
  expectedArxivIds: string[]
): {
  scores: CandidateScoringLlmScore[];
  missingArxivIds: string[];
} {
  if (!isRecord(output) || !Array.isArray(output.scores)) {
    throw new CandidateScoringValidationError("scores must be an array");
  }

  const expected = new Set(expectedArxivIds);
  const seen = new Set<string>();
  const scores = output.scores.map((score) => validateScore(score, expected, seen));
  const missingArxivIds = expectedArxivIds.filter((arxivId) => !seen.has(arxivId));

  return {
    scores,
    missingArxivIds
  };
}

function validateScore(
  value: unknown,
  expected: Set<string>,
  seen: Set<string>
): CandidateScoringLlmScore {
  if (!isRecord(value)) {
    throw new CandidateScoringValidationError("score entries must be objects");
  }

  const arxivId = value.arxiv_id;

  if (typeof arxivId !== "string" || !expected.has(arxivId)) {
    throw new CandidateScoringValidationError("score arxiv_id is not in the batch");
  }

  if (seen.has(arxivId)) {
    throw new CandidateScoringValidationError("duplicate score arxiv_id");
  }

  seen.add(arxivId);

  return {
    arxiv_id: arxivId,
    topic_relevance: integerDimension(value.topic_relevance, "topic_relevance"),
    technical_quality: integerDimension(value.technical_quality, "technical_quality"),
    practical_value: integerDimension(value.practical_value, "practical_value"),
    novelty: integerDimension(value.novelty, "novelty"),
    final_score: finalScore(value.final_score),
    should_include: booleanField(value.should_include, "should_include"),
    reason: reasonField(value.reason)
  };
}

function integerDimension(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 10) {
    throw new CandidateScoringValidationError(`${field} must be an integer between 0 and 10`);
  }

  return value;
}

function finalScore(value: unknown): number {
  if (typeof value !== "number" || value < 0 || value > 10) {
    throw new CandidateScoringValidationError("final_score must be between 0 and 10");
  }

  return value;
}

function booleanField(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new CandidateScoringValidationError(`${field} must be a boolean`);
  }

  return value;
}

function reasonField(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CandidateScoringValidationError("reason must be non-empty");
  }

  return value.trim();
}
