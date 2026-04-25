import type { ArxivPaper, Assistant, JsonValue } from "../domain/types";
import { isRecord } from "../utils";
import type { SelectedPaper } from "../domain/ranking";
import type { LlmProvider } from "./provider";
import {
  DIGEST_GENERATION_PROMPT_VERSION,
  buildDigestGenerationSystemPrompt,
  buildDigestGenerationUserPrompt
} from "./prompts/digestGeneration";

export interface DigestGenerationResult {
  markdown: string;
  rawModelOutput: JsonValue;
  model: string;
}

export async function generateDigestMarkdown(
  input: {
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
  },
  provider: LlmProvider
): Promise<DigestGenerationResult> {
  const response = await provider.generateJson<unknown>({
    promptVersion: DIGEST_GENERATION_PROMPT_VERSION,
    systemPrompt: buildDigestGenerationSystemPrompt(),
    userPrompt: buildDigestGenerationUserPrompt(input),
    schemaName: "digest_markdown"
  });

  if (!isRecord(response.parsed) || typeof response.parsed.markdown !== "string") {
    throw new Error("Digest generation output must include markdown");
  }

  return {
    markdown: response.parsed.markdown,
    rawModelOutput: response.rawOutput,
    model: response.model
  };
}
