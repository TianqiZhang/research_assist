import { marked } from "marked";

import type { Repositories } from "../db/repositories";
import {
  DIGEST_GENERATION_PROMPT_VERSION
} from "../llm/prompts/digestGeneration";
import { QUALITY_CHECK_PROMPT_VERSION } from "../llm/prompts/qualityCheck";
import { generateDigestMarkdown } from "../llm/digestGeneration";
import { runQualityCheck } from "../llm/qualityCheck";
import type { LlmProvider } from "../llm/provider";
import { selectPapers, type SelectedPaper } from "./ranking";
import type { ArxivPaper, Assistant, Digest, JsonValue } from "./types";

export interface GenerateDigestInput {
  runId: string;
  assistantId: string;
  paperCount: number;
}

export async function generateAndSaveDigest(
  input: GenerateDigestInput,
  dependencies: {
    repositories: Repositories;
    llmProvider: LlmProvider;
  }
): Promise<Digest> {
  const assistant = await dependencies.repositories.assistants.getById(input.assistantId);

  if (!assistant) {
    throw new Error("Assistant not found");
  }

  const selected = await selectPapers(input, dependencies);
  const candidateCount = (await dependencies.repositories.candidates.listByRun(input.runId))
    .length;

  if (selected.length === 0) {
    const emptyMd = emptyDigestMarkdown(assistant, candidateCount);
    return dependencies.repositories.digests.create({
      runId: input.runId,
      assistantId: input.assistantId,
      markdown: emptyMd,
      html: markdownToHtml(emptyMd),
      selectedPapers: [],
      candidateCount,
      qualityCheck: {
        passed: true,
        issues: [],
        suggested_fixes: ["No selected papers to review."]
      },
      digestPromptVersion: DIGEST_GENERATION_PROMPT_VERSION,
      qualityPromptVersion: QUALITY_CHECK_PROMPT_VERSION,
      rawDigestOutput: {
        skipped: true,
        reason: "No selected papers"
      },
      rawQualityOutput: {
        skipped: true,
        reason: "No selected papers"
      },
      emailStatus: "skipped"
    });
  }

  const selectedWithPapers = await loadSelectedPapers(selected, dependencies.repositories);
  const firstDigest = await generateDigestMarkdown(
    {
      assistant,
      candidateCount,
      selected: selectedWithPapers
    },
    dependencies.llmProvider
  );
  let markdown = firstDigest.markdown;
  let rawDigestOutput = firstDigest.rawModelOutput;
  let quality = await runQualityCheck(
    {
      markdown,
      selectedPapers: selectedPapersForQuality(selectedWithPapers)
    },
    dependencies.llmProvider
  );
  let rawQualityOutput = quality.rawModelOutput;

  if (!quality.passed) {
    const regenerated = await generateDigestMarkdown(
      {
        assistant,
        candidateCount,
        selected: selectedWithPapers,
        qualityFeedback: {
          issues: quality.issues,
          suggestedFixes: quality.suggestedFixes
        }
      },
      dependencies.llmProvider
    );

    markdown = regenerated.markdown;
    rawDigestOutput = regenerated.rawModelOutput;
    quality = await runQualityCheck(
      {
        markdown,
        selectedPapers: selectedPapersForQuality(selectedWithPapers)
      },
      dependencies.llmProvider
    );
    rawQualityOutput = quality.rawModelOutput;
  }

  assertDigestDoesNotClaimFullText(markdown);

  return dependencies.repositories.digests.create({
    runId: input.runId,
    assistantId: input.assistantId,
    markdown,
    html: markdownToHtml(markdown),
    selectedPapers: selected.map((paper) => ({
      arxiv_id: paper.arxivId,
      rank: paper.rank,
      final_score: paper.finalScore,
      selection_reason: paper.selectionReason
    })),
    candidateCount,
    qualityCheck: {
      passed: quality.passed,
      issues: quality.issues,
      suggested_fixes: quality.suggestedFixes
    },
    digestPromptVersion: DIGEST_GENERATION_PROMPT_VERSION,
    qualityPromptVersion: QUALITY_CHECK_PROMPT_VERSION,
    rawDigestOutput,
    rawQualityOutput,
    emailStatus: selected.length === 0 ? "skipped" : "not_sent"
  });
}

export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, {
    async: false
  }) as string;
}

export function assertDigestDoesNotClaimFullText(markdown: string): void {
  const normalized = markdown.toLowerCase();
  const forbidden = ["after reading the full paper", "full pdf", "entire paper"];

  if (forbidden.some((phrase) => normalized.includes(phrase))) {
    throw new Error("Digest must not claim full-text or full-PDF review");
  }
}

async function loadSelectedPapers(
  selected: SelectedPaper[],
  repositories: Repositories
): Promise<
  Array<{
    selection: SelectedPaper;
    paper: ArxivPaper;
  }>
> {
  const papers = await repositories.papers.getByIds(selected.map((paper) => paper.arxivId));
  const papersById = new Map(papers.map((paper) => [paper.arxivId, paper]));

  return selected
    .map((selection) => {
      const paper = papersById.get(selection.arxivId);
      return paper ? { selection, paper } : undefined;
    })
    .filter((item): item is { selection: SelectedPaper; paper: ArxivPaper } =>
      Boolean(item)
    );
}

function selectedPapersForQuality(
  selected: Array<{
    selection: SelectedPaper;
    paper: ArxivPaper;
  }>
): JsonValue[] {
  return selected.map(({ selection, paper }) => ({
    rank: selection.rank,
    arxiv_id: paper.arxivId,
    title: paper.title,
    abstract: paper.abstract,
    selection_reason: selection.selectionReason
  }));
}

function emptyDigestMarkdown(assistant: Assistant, candidateCount: number): string {
  return [
    `# ${assistant.name}`,
    "",
    `Selected from ${candidateCount} recent papers.`,
    "",
    "No papers met the selection criteria for this run."
  ].join("\n");
}
