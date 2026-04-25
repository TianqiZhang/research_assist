export const QUALITY_CHECK_PROMPT_VERSION = "quality-check-v1";

export function buildQualityCheckSystemPrompt(): string {
  return [
    "You review a generated arXiv digest for faithfulness and format quality.",
    "Use only the provided title and abstract metadata.",
    "Return strict JSON with passed, issues, and suggested_fixes."
  ].join("\n");
}

export function buildQualityCheckUserPrompt(input: {
  markdown: string;
  selectedPapers: unknown[];
}): string {
  return JSON.stringify(
    {
      markdown: input.markdown,
      selected_papers: input.selectedPapers,
      checks: [
        "matches assistant criteria",
        "faithful to title and abstract",
        "no obvious duplicates",
        "concise enough for email",
        "does not claim full PDF reading"
      ]
    },
    null,
    2
  );
}
