import type { ArxivPaper, Assistant } from "../../domain/types";
import type { SelectedPaper } from "../../domain/ranking";

export const DIGEST_GENERATION_PROMPT_VERSION = "digest-generation-v1";

export function buildDigestGenerationSystemPrompt(): string {
  return [
    "You write concise research digests from arXiv title and abstract metadata only.",
    "Do not imply that the full PDF was read.",
    "Return strict JSON with a markdown field."
  ].join("\n");
}

export function buildDigestGenerationUserPrompt(input: {
  assistant: Assistant;
  candidateCount: number;
  selected: Array<{
    selection: SelectedPaper;
    paper: ArxivPaper;
  }>;
  qualityFeedback?: {
    issues: string[];
    suggestedFixes: string[];
  };
}): string {
  return JSON.stringify(
    {
      assistant_name: input.assistant.name,
      assistant_description: input.assistant.description,
      candidate_count: input.candidateCount,
      quality_feedback: input.qualityFeedback,
      required_format: [
        "# {assistant_name}",
        "Selected from {candidate_count} recent papers.",
        "## 1. {paper_title}",
        "Authors: {authors}",
        "Link: {arxiv_url}",
        "Key idea:",
        "Why this matches:",
        "Potential limitations:"
      ],
      selected_papers: input.selected.map(({ selection, paper }) => ({
        rank: selection.rank,
        arxiv_id: paper.arxivId,
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors,
        categories: paper.categories,
        published_at: paper.publishedAt,
        arxiv_url: paper.absUrl,
        selection_reason: selection.selectionReason,
        final_score: selection.finalScore
      }))
    },
    null,
    2
  );
}
