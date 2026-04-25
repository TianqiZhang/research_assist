import type { JsonObject, JsonValue } from "../domain/types";
import { isRecord, retryAsync } from "../utils";
import type { LlmProvider } from "./provider";
import {
  PROFILE_COMPILER_PROMPT_VERSION,
  buildProfileCompilerSystemPrompt,
  buildProfileCompilerUserPrompt
} from "./prompts/profileCompiler";

export interface CompileProfileInput {
  name: string;
  description: string;
  arxivCategories: string[];
}

export interface CompiledProfile {
  promptVersion: typeof PROFILE_COMPILER_PROMPT_VERSION;
  profile: JsonObject;
  rawModelOutput: JsonValue;
  model: string;
  warnings: string[];
}

export class ProfileCompilerError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ProfileCompilerError";
    this.cause = cause;
  }
}

const DEFAULT_RUBRIC = {
  topic_relevance: 0.35,
  technical_quality: 0.25,
  practical_value: 0.25,
  novelty: 0.15
};

const RUBRIC_KEYS = [
  "topic_relevance",
  "technical_quality",
  "practical_value",
  "novelty"
] as const;

export async function compileAssistantProfile(
  input: CompileProfileInput,
  provider: LlmProvider,
  maxRetries = 2
): Promise<CompiledProfile> {
  return retryAsync(
    async () => {
      const response = await provider.generateJson<unknown>({
        promptVersion: PROFILE_COMPILER_PROMPT_VERSION,
        systemPrompt: buildProfileCompilerSystemPrompt(),
        userPrompt: buildProfileCompilerUserPrompt(input),
        schemaName: "assistant_profile"
      });
      const validation = validateProfileCompilerOutput(response.parsed);

      return {
        promptVersion: PROFILE_COMPILER_PROMPT_VERSION,
        profile: validation.profile,
        rawModelOutput: response.rawOutput,
        model: response.model,
        warnings: validation.warnings
      };
    },
    maxRetries,
    (lastError) => new ProfileCompilerError("Profile compiler failed after retries", lastError)
  );
}

export function validateProfileCompilerOutput(output: unknown): {
  profile: JsonObject;
  warnings: string[];
} {
  if (!isRecord(output)) {
    throw new ProfileCompilerError("Profile compiler output must be a JSON object");
  }

  const includeTopics = requiredStringArray(output.include_topics, "include_topics");
  const excludeTopics = requiredStringArray(output.exclude_topics, "exclude_topics");
  const positiveSignals = requiredStringArray(output.positive_signals, "positive_signals");
  const negativeSignals = requiredStringArray(output.negative_signals, "negative_signals");
  const rubric = normalizeRubric(output.scoring_rubric);

  return {
    profile: {
      include_topics: includeTopics,
      exclude_topics: excludeTopics,
      positive_signals: positiveSignals,
      negative_signals: negativeSignals,
      scoring_rubric: rubric.value
    },
    warnings: rubric.warnings
  };
}

function requiredStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ProfileCompilerError(`${field} must be an array of strings`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function normalizeRubric(value: unknown): {
  value: JsonObject;
  warnings: string[];
} {
  if (!isRecord(value)) {
    return {
      value: DEFAULT_RUBRIC,
      warnings: ["scoring_rubric missing or invalid; defaults applied"]
    };
  }

  const hasAllKeys = RUBRIC_KEYS.every((key) => typeof value[key] === "number");

  if (!hasAllKeys) {
    return {
      value: DEFAULT_RUBRIC,
      warnings: ["scoring_rubric missing required keys; defaults applied"]
    };
  }

  const candidate = Object.fromEntries(
    RUBRIC_KEYS.map((key) => [key, value[key] as number])
  ) as typeof DEFAULT_RUBRIC;
  const sum = RUBRIC_KEYS.reduce((total, key) => total + candidate[key], 0);
  const allPositive = RUBRIC_KEYS.every((key) => candidate[key] > 0);

  if (!allPositive || Math.abs(sum - 1) > 0.01) {
    return {
      value: DEFAULT_RUBRIC,
      warnings: ["scoring_rubric values invalid; defaults applied"]
    };
  }

  return {
    value: candidate,
    warnings: []
  };
}
