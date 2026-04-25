import type { ArxivPaper, AssistantProfile, RunCandidate } from "../../domain/types";

export const CANDIDATE_SCORING_PROMPT_VERSION = "candidate-scoring-v1";

export function buildCandidateScoringSystemPrompt(): string {
  return [
    "You score arXiv paper candidates against a compiled research assistant profile.",
    "Use only title, abstract, authors, categories, dates, and arXiv URL.",
    "Return strict JSON with a scores array and no prose outside JSON."
  ].join("\n");
}

export function buildCandidateScoringUserPrompt(input: {
  profile: AssistantProfile;
  candidates: Array<{
    candidate: RunCandidate;
    paper: ArxivPaper;
  }>;
}): string {
  const compactCandidates = input.candidates.map(({ candidate, paper }) => ({
    arxiv_id: paper.arxivId,
    candidate_rank: candidate.candidateRank,
    title: paper.title,
    abstract: paper.abstract,
    authors: paper.authors,
    categories: paper.categories,
    published_at: paper.publishedAt,
    arxiv_url: paper.absUrl,
    candidate_reason: candidate.candidateReason
  }));

  return JSON.stringify(
    {
      profile_version: input.profile.version,
      profile: input.profile.profile,
      candidates: compactCandidates,
      output_schema: {
        scores: [
          {
            arxiv_id: "string",
            topic_relevance: "integer 0-10",
            technical_quality: "integer 0-10",
            practical_value: "integer 0-10",
            novelty: "integer 0-10",
            final_score: "number 0-10",
            should_include: "boolean",
            reason: "concise string"
          }
        ]
      }
    },
    null,
    2
  );
}
