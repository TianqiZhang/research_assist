import type { JsonValue } from "../domain/types";
import { isRecord } from "../utils";
import type { LlmProvider } from "./provider";
import {
  QUALITY_CHECK_PROMPT_VERSION,
  buildQualityCheckSystemPrompt,
  buildQualityCheckUserPrompt
} from "./prompts/qualityCheck";

export interface QualityCheckResult {
  passed: boolean;
  issues: string[];
  suggestedFixes: string[];
  rawModelOutput: JsonValue;
  model: string;
}

export async function runQualityCheck(
  input: {
    markdown: string;
    selectedPapers: unknown[];
  },
  provider: LlmProvider
): Promise<QualityCheckResult> {
  const response = await provider.generateJson<unknown>({
    promptVersion: QUALITY_CHECK_PROMPT_VERSION,
    systemPrompt: buildQualityCheckSystemPrompt(),
    userPrompt: buildQualityCheckUserPrompt(input),
    schemaName: "digest_quality_check"
  });

  if (!isRecord(response.parsed)) {
    throw new Error("Quality check output must be an object");
  }

  const passed = response.parsed.passed;
  const issues = response.parsed.issues;
  const suggestedFixes = response.parsed.suggested_fixes;

  if (
    typeof passed !== "boolean" ||
    !Array.isArray(issues) ||
    issues.some((issue) => typeof issue !== "string") ||
    !Array.isArray(suggestedFixes) ||
    suggestedFixes.some((fix) => typeof fix !== "string")
  ) {
    throw new Error("Quality check output has invalid shape");
  }

  return {
    passed,
    issues,
    suggestedFixes,
    rawModelOutput: response.rawOutput,
    model: response.model
  };
}
