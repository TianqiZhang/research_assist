export const PROFILE_COMPILER_PROMPT_VERSION = "profile-compiler-v1";

export function buildProfileCompilerSystemPrompt(): string {
  return [
    "You compile natural-language research assistant criteria into strict JSON.",
    "Use only the requested schema.",
    "Do not include prose outside the JSON object."
  ].join("\n");
}

export function buildProfileCompilerUserPrompt(input: {
  name: string;
  description: string;
  arxivCategories: string[];
}): string {
  return [
    `Assistant name: ${input.name}`,
    `Description: ${input.description}`,
    `arXiv categories: ${input.arxivCategories.join(", ")}`,
    "",
    "Return JSON with include_topics, exclude_topics, positive_signals, negative_signals, and scoring_rubric.",
    "Rubric keys must be topic_relevance, technical_quality, practical_value, and novelty."
  ].join("\n");
}
