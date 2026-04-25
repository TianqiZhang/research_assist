import { describe, expect, it } from "vitest";

import {
  MockLlmProvider,
  compileAssistantProfile,
  validateProfileCompilerOutput
} from "../../src/llm";
import { PROFILE_COMPILER_PROMPT_VERSION } from "../../src/llm/prompts/profileCompiler";

const compileInput = {
  name: "Agent Papers",
  description: "Find practical papers about AI agents and RAG.",
  arxivCategories: ["cs.AI", "cs.CL"]
};

describe("compileAssistantProfile", () => {
  it("returns a validated profile with prompt version and raw output", async () => {
    const provider = new MockLlmProvider();

    const result = await compileAssistantProfile(compileInput, provider);

    expect(result.promptVersion).toBe(PROFILE_COMPILER_PROMPT_VERSION);
    expect(result.profile).toMatchObject({
      include_topics: ["AI agents", "tool use", "RAG"],
      scoring_rubric: {
        topic_relevance: 0.35
      }
    });
    expect(result.rawModelOutput).toContain("include_topics");
    expect(provider.calls).toHaveLength(1);
  });

  it("retries invalid JSON before returning a valid profile", async () => {
    const provider = new MockLlmProvider([
      "{ invalid json",
      {
        include_topics: ["AI agents"],
        exclude_topics: [],
        positive_signals: ["benchmark"],
        negative_signals: [],
        scoring_rubric: {
          topic_relevance: 0.35,
          technical_quality: 0.25,
          practical_value: 0.25,
          novelty: 0.15
        }
      }
    ]);

    const result = await compileAssistantProfile(compileInput, provider);

    expect(result.profile.include_topics).toEqual(["AI agents"]);
    expect(provider.calls).toHaveLength(2);
  });
});

describe("validateProfileCompilerOutput", () => {
  it("normalizes invalid rubric values to defaults", () => {
    const result = validateProfileCompilerOutput({
      include_topics: ["AI agents"],
      exclude_topics: ["pure theory"],
      positive_signals: ["code"],
      negative_signals: ["no experiments"],
      scoring_rubric: {
        topic_relevance: 10,
        technical_quality: 10,
        practical_value: 10,
        novelty: 10
      }
    });

    expect(result.profile.scoring_rubric).toEqual({
      topic_relevance: 0.35,
      technical_quality: 0.25,
      practical_value: 0.25,
      novelty: 0.15
    });
    expect(result.warnings).toEqual(["scoring_rubric values invalid; defaults applied"]);
  });

  it("rejects missing required arrays", () => {
    expect(() =>
      validateProfileCompilerOutput({
        include_topics: "AI agents",
        exclude_topics: [],
        positive_signals: [],
        negative_signals: [],
        scoring_rubric: {
          topic_relevance: 0.35,
          technical_quality: 0.25,
          practical_value: 0.25,
          novelty: 0.15
        }
      })
    ).toThrow(/include_topics must be an array of strings/);
  });
});
