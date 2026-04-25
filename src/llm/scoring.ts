import type { Repositories } from "../db/repositories";
import {
  validateCandidateScoringOutput,
  type CandidateScoreOutput,
  type CandidateScoringLlmScore,
  type ScoreCandidatesInput
} from "../domain/scoring";
import type { ArxivPaper, RunCandidate } from "../domain/types";
import type { LlmProvider } from "./provider";
import {
  CANDIDATE_SCORING_PROMPT_VERSION,
  buildCandidateScoringSystemPrompt,
  buildCandidateScoringUserPrompt
} from "./prompts/candidateScoring";
import { retryAsync } from "../utils";

const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_RETRIES = 2;

export async function scoreCandidates(
  input: ScoreCandidatesInput,
  dependencies: {
    repositories: Repositories;
    llmProvider: LlmProvider;
  }
): Promise<CandidateScoreOutput[]> {
  const profile = await dependencies.repositories.profiles.getByVersion(
    input.assistantId,
    input.profileVersion
  );

  if (!profile) {
    throw new Error("Assistant profile version not found");
  }

  const candidates = await dependencies.repositories.candidates.listByRun(input.runId);
  const existingScores = await dependencies.repositories.scores.listByRun(input.runId);
  const scoredIds = new Set(existingScores.map((score) => score.arxivId));
  const unscoredCandidates = candidates.filter((candidate) => !scoredIds.has(candidate.arxivId));

  if (unscoredCandidates.length === 0) {
    return [];
  }

  const papers = await dependencies.repositories.papers.getByIds(
    unscoredCandidates.map((candidate) => candidate.arxivId)
  );
  const papersById = new Map(papers.map((paper) => [paper.arxivId, paper]));
  const batchSize = input.batchSize ?? DEFAULT_BATCH_SIZE;
  const persisted: CandidateScoreOutput[] = [];

  for (const batch of chunks(unscoredCandidates, batchSize)) {
    const batchWithPapers = batch
      .map((candidate) => ({
        candidate,
        paper: papersById.get(candidate.arxivId)
      }))
      .filter((item): item is { candidate: RunCandidate; paper: ArxivPaper } =>
        Boolean(item.paper)
      );

    try {
      const scoredBatch = await scoreBatchWithRepair({
        provider: dependencies.llmProvider,
        profile,
        candidates: batchWithPapers
      });
      const rows = await dependencies.repositories.scores.insertMany(
        input.runId,
        scoredBatch.map((score) => ({
          arxivId: score.arxivId,
          promptVersion: CANDIDATE_SCORING_PROMPT_VERSION,
          topicRelevance: score.topicRelevance,
          technicalQuality: score.technicalQuality,
          practicalValue: score.practicalValue,
          novelty: score.novelty,
          finalScore: score.finalScore,
          shouldInclude: score.shouldInclude,
          reason: score.reason,
          rawModelOutput: score.rawModelOutput,
          model: score.model
        }))
      );

      persisted.push(
        ...rows.map((row) => ({
          arxivId: row.arxivId,
          topicRelevance: row.topicRelevance,
          technicalQuality: row.technicalQuality,
          practicalValue: row.practicalValue,
          novelty: row.novelty,
          finalScore: row.finalScore,
          shouldInclude: row.shouldInclude,
          reason: row.reason,
          rawModelOutput: row.rawModelOutput,
          model: row.model ?? "unknown"
        }))
      );
    } catch (error) {
      await dependencies.repositories.runEvents.append({
        runId: input.runId,
        step: "score_candidates",
        level: "error",
        message: "Failed to score candidate batch",
        details: {
          candidate_ids: batch.map((candidate) => candidate.arxivId),
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }
  }

  return persisted;
}

async function scoreBatchWithRepair(input: {
  provider: LlmProvider;
  profile: Parameters<typeof buildCandidateScoringUserPrompt>[0]["profile"];
  candidates: Array<{
    candidate: RunCandidate;
    paper: ArxivPaper;
  }>;
}): Promise<CandidateScoreOutput[]> {
  const initial = await scoreBatch(input);

  if (initial.missingArxivIds.length === 0) {
    return initial.scores;
  }

  const missingCandidates = input.candidates.filter(({ candidate }) =>
    initial.missingArxivIds.includes(candidate.arxivId)
  );
  const repaired = await scoreBatch({
    ...input,
    candidates: missingCandidates
  });

  if (repaired.missingArxivIds.length > 0) {
    throw new Error(`Missing scores for candidates: ${repaired.missingArxivIds.join(", ")}`);
  }

  return [...initial.scores, ...repaired.scores];
}

async function scoreBatch(input: {
  provider: LlmProvider;
  profile: Parameters<typeof buildCandidateScoringUserPrompt>[0]["profile"];
  candidates: Array<{
    candidate: RunCandidate;
    paper: ArxivPaper;
  }>;
}): Promise<{
  scores: CandidateScoreOutput[];
  missingArxivIds: string[];
}> {
  const expectedIds = input.candidates.map(({ candidate }) => candidate.arxivId);

  return retryAsync(
    async () => {
      const response = await input.provider.generateJson<unknown>({
        promptVersion: CANDIDATE_SCORING_PROMPT_VERSION,
        systemPrompt: buildCandidateScoringSystemPrompt(),
        userPrompt: buildCandidateScoringUserPrompt({
          profile: input.profile,
          candidates: input.candidates
        }),
        schemaName: "candidate_scores"
      });
      const validated = validateCandidateScoringOutput(response.parsed, expectedIds);

      return {
        scores: validated.scores.map((score) =>
          toCandidateScoreOutput(score, response.rawOutput, response.model)
        ),
        missingArxivIds: validated.missingArxivIds
      };
    },
    MAX_BATCH_RETRIES
  );
}

function toCandidateScoreOutput(
  score: CandidateScoringLlmScore,
  rawModelOutput: CandidateScoreOutput["rawModelOutput"],
  model: string
): CandidateScoreOutput {
  return {
    arxivId: score.arxiv_id,
    topicRelevance: score.topic_relevance,
    technicalQuality: score.technical_quality,
    practicalValue: score.practical_value,
    novelty: score.novelty,
    finalScore: score.final_score,
    shouldInclude: score.should_include,
    reason: score.reason,
    rawModelOutput,
    model
  };
}

function chunks<T>(values: T[], size: number): T[][] {
  const chunkSize = Math.max(1, size);
  const result: T[][] = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    result.push(values.slice(index, index + chunkSize));
  }

  return result;
}
