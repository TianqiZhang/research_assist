import type { Repositories } from "../db/repositories";
import type { ArxivPaper, AssistantProfile, JsonObject } from "./types";
import { clamp, findMatchedTerms } from "./textMatching";

export const DEFAULT_CANDIDATE_LIMIT = 60;
export const MIN_CANDIDATE_LIMIT = 10;
export const MAX_CANDIDATE_LIMIT = 100;

export interface GenerateCandidatesInput {
  runId: string;
  assistantId: string;
  profileVersion: number;
  categories: string[];
  fromDate: string;
  toDate: string;
  limit?: number;
}

export interface GeneratedCandidate {
  arxivId: string;
  candidateRank: number;
  cheapScore: number;
  candidateReason: string;
}

export interface CandidateProfileTerms {
  includeTopics: string[];
  excludeTopics: string[];
  positiveSignals: string[];
  negativeSignals: string[];
}

export interface CandidateScoreDetails extends GeneratedCandidate {
  matchedIncludeTopics: string[];
  matchedExcludeTopics: string[];
  matchedPositiveSignals: string[];
  matchedNegativeSignals: string[];
  categoryMatchScore: number;
  keywordMatchScore: number;
  recencyScore: number;
}

export async function generateCandidates(
  input: GenerateCandidatesInput,
  dependencies: {
    repositories: Repositories;
  }
): Promise<GeneratedCandidate[]> {
  const profile = await dependencies.repositories.profiles.getByVersion(
    input.assistantId,
    input.profileVersion
  );

  if (!profile) {
    throw new Error("Assistant profile version not found");
  }

  const limit = normalizeCandidateLimit(input.limit);
  const papers = await dependencies.repositories.papers.searchRecent({
    categories: input.categories,
    fromDate: input.fromDate,
    toDate: input.toDate
  });
  const profileTerms = extractCandidateProfileTerms(profile);
  const scored = papers
    .map((paper) =>
      scoreCandidatePaper({
        paper,
        profileTerms,
        preferredCategories: input.categories,
        fromDate: input.fromDate,
        toDate: input.toDate
      })
    )
    .sort(compareScoreDetails)
    .slice(0, limit)
    .map((candidate, index) => ({
      ...candidate,
      candidateRank: index + 1
    }));

  const inserted = await dependencies.repositories.candidates.insertMany(
    input.runId,
    scored.map((candidate) => ({
      arxivId: candidate.arxivId,
      candidateRank: candidate.candidateRank,
      cheapScore: candidate.cheapScore,
      candidateReason: candidate.candidateReason,
      source: {
        category_match_score: candidate.categoryMatchScore,
        keyword_match_score: candidate.keywordMatchScore,
        recency_score: candidate.recencyScore,
        matched_include_topics: candidate.matchedIncludeTopics,
        matched_positive_signals: candidate.matchedPositiveSignals,
        matched_exclude_topics: candidate.matchedExcludeTopics,
        matched_negative_signals: candidate.matchedNegativeSignals
      }
    }))
  );

  return inserted.map((candidate) => ({
    arxivId: candidate.arxivId,
    candidateRank: candidate.candidateRank,
    cheapScore: candidate.cheapScore,
    candidateReason: candidate.candidateReason
  }));
}

export function scoreCandidatePaper(input: {
  paper: ArxivPaper;
  profileTerms: CandidateProfileTerms;
  preferredCategories: string[];
  fromDate: string;
  toDate: string;
}): CandidateScoreDetails {
  const text = `${input.paper.title} ${input.paper.abstract}`;
  const matchedIncludeTopics = findMatchedTerms(text, input.profileTerms.includeTopics);
  const matchedPositiveSignals = findMatchedTerms(text, input.profileTerms.positiveSignals);
  const matchedExcludeTopics = findMatchedTerms(text, input.profileTerms.excludeTopics);
  const matchedNegativeSignals = findMatchedTerms(text, input.profileTerms.negativeSignals);
  const categoryMatchScore = getCategoryMatchScore(input.paper, input.preferredCategories);
  const keywordMatchScore = getKeywordMatchScore({
    includeCount: matchedIncludeTopics.length,
    positiveCount: matchedPositiveSignals.length,
    excludeCount: matchedExcludeTopics.length,
    negativeCount: matchedNegativeSignals.length,
    includeTotal: input.profileTerms.includeTopics.length,
    positiveTotal: input.profileTerms.positiveSignals.length,
    excludeTotal: input.profileTerms.excludeTopics.length,
    negativeTotal: input.profileTerms.negativeSignals.length
  });
  const recencyScore = getRecencyScore(input.paper.publishedAt, input.fromDate, input.toDate);
  const cheapScore = roundScore(
    0.45 * categoryMatchScore + 0.35 * keywordMatchScore + 0.2 * recencyScore
  );

  return {
    arxivId: input.paper.arxivId,
    candidateRank: 0,
    cheapScore,
    candidateReason: buildCandidateReason({
      paper: input.paper,
      matchedIncludeTopics,
      matchedPositiveSignals,
      matchedExcludeTopics,
      matchedNegativeSignals
    }),
    matchedIncludeTopics,
    matchedPositiveSignals,
    matchedExcludeTopics,
    matchedNegativeSignals,
    categoryMatchScore,
    keywordMatchScore,
    recencyScore
  };
}

export function extractCandidateProfileTerms(profile: AssistantProfile): CandidateProfileTerms {
  return {
    includeTopics: stringArray(profile.profile, "include_topics"),
    excludeTopics: stringArray(profile.profile, "exclude_topics"),
    positiveSignals: stringArray(profile.profile, "positive_signals"),
    negativeSignals: stringArray(profile.profile, "negative_signals")
  };
}

export function normalizeCandidateLimit(limit: number | undefined): number {
  return clamp(limit ?? DEFAULT_CANDIDATE_LIMIT, MIN_CANDIDATE_LIMIT, MAX_CANDIDATE_LIMIT);
}

function getCategoryMatchScore(paper: ArxivPaper, preferredCategories: string[]): number {
  if (preferredCategories.length === 0) {
    return 0;
  }

  if (paper.primaryCategory && preferredCategories.includes(paper.primaryCategory)) {
    return 1;
  }

  return paper.categories.some((category) => preferredCategories.includes(category)) ? 0.85 : 0;
}

function getKeywordMatchScore(input: {
  includeCount: number;
  positiveCount: number;
  excludeCount: number;
  negativeCount: number;
  includeTotal: number;
  positiveTotal: number;
  excludeTotal: number;
  negativeTotal: number;
}): number {
  const positiveTotal = Math.max(input.includeTotal + input.positiveTotal, 1);
  const negativeTotal = Math.max(input.excludeTotal + input.negativeTotal, 1);
  const positiveScore = (input.includeCount + input.positiveCount) / positiveTotal;
  const negativePenalty = (input.excludeCount + input.negativeCount) / negativeTotal;

  return clamp(positiveScore - negativePenalty, 0, 1);
}

function getRecencyScore(publishedAt: string, fromDate: string, toDate: string): number {
  const publishedTime = Date.parse(publishedAt);
  const fromTime = Date.parse(fromDate);
  const toTime = /^\d{4}-\d{2}-\d{2}$/.test(toDate)
    ? Date.parse(`${toDate}T23:59:59.999Z`)
    : Date.parse(toDate);

  if ([publishedTime, fromTime, toTime].some(Number.isNaN) || toTime <= fromTime) {
    return 1;
  }

  return clamp((publishedTime - fromTime) / (toTime - fromTime), 0, 1);
}

function buildCandidateReason(input: {
  paper: ArxivPaper;
  matchedIncludeTopics: string[];
  matchedPositiveSignals: string[];
  matchedExcludeTopics: string[];
  matchedNegativeSignals: string[];
}): string {
  const parts: string[] = [];

  if (input.matchedIncludeTopics.length > 0) {
    parts.push(`Matched include topics: ${input.matchedIncludeTopics.join(", ")}`);
  }

  if (input.matchedPositiveSignals.length > 0) {
    parts.push(`Positive signals: ${input.matchedPositiveSignals.join(", ")}`);
  }

  if (input.matchedExcludeTopics.length > 0) {
    parts.push(`Excluded topics present: ${input.matchedExcludeTopics.join(", ")}`);
  }

  if (input.matchedNegativeSignals.length > 0) {
    parts.push(`Negative signals present: ${input.matchedNegativeSignals.join(", ")}`);
  }

  if (input.paper.primaryCategory) {
    parts.push(`Primary category ${input.paper.primaryCategory}`);
  }

  if (parts.length === 0) {
    return "No explicit topic matches.";
  }

  return `${parts.join(". ")}.`;
}

function compareScoreDetails(a: CandidateScoreDetails, b: CandidateScoreDetails): number {
  if (b.cheapScore !== a.cheapScore) {
    return b.cheapScore - a.cheapScore;
  }

  if (b.recencyScore !== a.recencyScore) {
    return b.recencyScore - a.recencyScore;
  }

  return a.arxivId.localeCompare(b.arxivId);
}

function stringArray(profile: JsonObject, key: string): string[] {
  const value = profile[key];

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map(normalizeTerm)
    : [];
}

function normalizeTerm(value: string): string {
  return value.trim();
}

function roundScore(value: number): number {
  return Math.round(value * 10000) / 10000;
}
