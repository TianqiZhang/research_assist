import type { Repositories } from "../db/repositories";
import type { ArxivPaper, RunCandidate, RunScore } from "./types";
import { normalizeText } from "./textMatching";

export interface SelectPapersInput {
  runId: string;
  assistantId: string;
  paperCount: number;
}

export interface SelectedPaper {
  arxivId: string;
  rank: number;
  finalScore: number;
  selectionReason: string;
}

interface RankingCandidate {
  score: RunScore;
  candidate: RunCandidate | undefined;
  paper: ArxivPaper;
  bucket: string;
}

const SCORE_THRESHOLD = 6.5;
const MAX_PER_BUCKET = 2;

export async function selectPapers(
  input: SelectPapersInput,
  dependencies: {
    repositories: Repositories;
  }
): Promise<SelectedPaper[]> {
  const scores = (await dependencies.repositories.scores.listByRun(input.runId))
    .filter((score) => score.shouldInclude)
    .sort((a, b) => b.finalScore - a.finalScore);
  const candidates = await dependencies.repositories.candidates.listByRun(input.runId);
  const candidatesById = new Map(candidates.map((candidate) => [candidate.arxivId, candidate]));
  const papers = await dependencies.repositories.papers.getByIds(
    scores.map((score) => score.arxivId)
  );
  const papersById = new Map(papers.map((paper) => [paper.arxivId, paper]));
  const rankingCandidates = scores
    .map((score) => {
      const paper = papersById.get(score.arxivId);

      if (!paper) {
        return undefined;
      }

      const candidate = candidatesById.get(score.arxivId);

      return {
        score,
        candidate,
        paper,
        bucket: getTopicBucket(candidate, paper)
      };
    })
    .filter((candidate): candidate is RankingCandidate => Boolean(candidate));
  const thresholded = rankingCandidates.filter(
    (candidate) => candidate.score.finalScore >= SCORE_THRESHOLD
  );
  const eligible =
    thresholded.length >= input.paperCount ? thresholded : rankingCandidates;
  const deduped = removeDuplicateTitles(eligible);
  const diversified = diversifyByBucket(deduped, input.paperCount);

  return diversified.map((candidate, index) => ({
    arxivId: candidate.score.arxivId,
    rank: index + 1,
    finalScore: candidate.score.finalScore,
    selectionReason: candidate.score.reason
  }));
}

export function removeDuplicateTitles(candidates: RankingCandidate[]): RankingCandidate[] {
  const selected: RankingCandidate[] = [];

  for (const candidate of candidates) {
    const duplicate = selected.some((existing) =>
      titlesAreNearDuplicates(existing.paper.title, candidate.paper.title)
    );

    if (!duplicate) {
      selected.push(candidate);
    }
  }

  return selected;
}

export function titlesAreNearDuplicates(a: string, b: string): boolean {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);

  if (normalizedA === normalizedB) {
    return true;
  }

  const aTokens = new Set(normalizedA.split(" ").filter(Boolean));
  const bTokens = new Set(normalizedB.split(" ").filter(Boolean));
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;

  return union > 0 && intersection / union >= 0.9;
}

function diversifyByBucket(candidates: RankingCandidate[], limit: number): RankingCandidate[] {
  const selected: RankingCandidate[] = [];
  const deferred: RankingCandidate[] = [];
  const bucketCounts = new Map<string, number>();

  for (const candidate of candidates) {
    const count = bucketCounts.get(candidate.bucket) ?? 0;

    if (count < MAX_PER_BUCKET && selected.length < limit) {
      selected.push(candidate);
      bucketCounts.set(candidate.bucket, count + 1);
    } else {
      deferred.push(candidate);
    }
  }

  for (const candidate of deferred) {
    if (selected.length >= limit) {
      break;
    }

    selected.push(candidate);
  }

  return selected;
}

function getTopicBucket(candidate: RunCandidate | undefined, paper: ArxivPaper): string {
  const source = candidate?.source;
  const matchedTopics = source?.matched_include_topics;

  if (
    Array.isArray(matchedTopics) &&
    matchedTopics.length > 0 &&
    typeof matchedTopics[0] === "string"
  ) {
    return matchedTopics[0];
  }

  return paper.primaryCategory ?? paper.categories[0] ?? "uncategorized";
}
