import { describe, expect, it } from "vitest";

import { createInMemoryRepositories } from "../../src/db/memory";
import { validateCandidateScoringOutput } from "../../src/domain/scoring";
import { scoreCandidates } from "../../src/llm";
import { CANDIDATE_SCORING_PROMPT_VERSION } from "../../src/llm/prompts/candidateScoring";
import { MockLlmProvider } from "../../src/llm/mockProvider";
import {
  fixtureAssistantInput,
  fixtureProfileInput,
  fixtureRunInput,
  fixtureUserInput
} from "../fixtures/domain";
import { candidatePaperFixtures } from "../fixtures/papers";

describe("validateCandidateScoringOutput", () => {
  it("accepts valid score JSON and reports missing candidates", () => {
    const result = validateCandidateScoringOutput(
      {
        scores: [scoreFor("2604.10001")]
      },
      ["2604.10001", "2604.10002"]
    );

    expect(result.scores).toHaveLength(1);
    expect(result.missingArxivIds).toEqual(["2604.10002"]);
  });

  it("rejects out-of-range scores", () => {
    expect(() =>
      validateCandidateScoringOutput(
        {
          scores: [
            {
              ...scoreFor("2604.10001"),
              final_score: 12
            }
          ]
        },
        ["2604.10001"]
      )
    ).toThrow(/final_score must be between 0 and 10/);
  });
});

describe("scoreCandidates", () => {
  it("scores candidates in batches and persists prompt version/raw output", async () => {
    const { repositories, run } = await createScoringFixture(3);
    const provider = new MockLlmProvider([
      {
        scores: [scoreFor("2604.10001", 8.7), scoreFor("2604.10002", 7.2)]
      },
      {
        scores: [scoreFor("2604.10003", 6.8)]
      }
    ]);

    const scores = await scoreCandidates(
      {
        runId: run.id,
        assistantId: fixtureAssistantInput.id!,
        profileVersion: 1,
        batchSize: 2
      },
      {
        repositories,
        llmProvider: provider
      }
    );
    const persisted = await repositories.scores.listByRun(run.id);

    expect(provider.calls).toHaveLength(2);
    expect(scores.map((score) => score.arxivId)).toEqual([
      "2604.10001",
      "2604.10002",
      "2604.10003"
    ]);
    expect(persisted).toHaveLength(3);
    expect(persisted[0]).toMatchObject({
      promptVersion: CANDIDATE_SCORING_PROMPT_VERSION,
      rawModelOutput: expect.stringContaining("2604.10001")
    });
  });

  it("retries invalid JSON before persisting scores", async () => {
    const { repositories, run } = await createScoringFixture(1);
    const provider = new MockLlmProvider([
      "{ invalid json",
      {
        scores: [scoreFor("2604.10001", 8.1)]
      }
    ]);

    const scores = await scoreCandidates(
      {
        runId: run.id,
        assistantId: fixtureAssistantInput.id!,
        profileVersion: 1,
        batchSize: 1
      },
      {
        repositories,
        llmProvider: provider
      }
    );

    expect(provider.calls).toHaveLength(2);
    expect(scores).toHaveLength(1);
  });

  it("issues one repair call for missing candidate IDs", async () => {
    const { repositories, run } = await createScoringFixture(2);
    const provider = new MockLlmProvider([
      {
        scores: [scoreFor("2604.10001", 8.1)]
      },
      {
        scores: [scoreFor("2604.10002", 7.9)]
      }
    ]);

    const scores = await scoreCandidates(
      {
        runId: run.id,
        assistantId: fixtureAssistantInput.id!,
        profileVersion: 1,
        batchSize: 2
      },
      {
        repositories,
        llmProvider: provider
      }
    );

    expect(provider.calls).toHaveLength(2);
    expect(scores.map((score) => score.arxivId)).toEqual(["2604.10001", "2604.10002"]);
  });

  it("keeps successful scores when a later batch fails", async () => {
    const { repositories, run } = await createScoringFixture(3);
    const invalidScore = {
      scores: [
        {
          ...scoreFor("2604.10003"),
          final_score: 11
        }
      ]
    };
    const provider = new MockLlmProvider([
      {
        scores: [scoreFor("2604.10001"), scoreFor("2604.10002")]
      },
      invalidScore,
      invalidScore,
      invalidScore
    ]);

    const scores = await scoreCandidates(
      {
        runId: run.id,
        assistantId: fixtureAssistantInput.id!,
        profileVersion: 1,
        batchSize: 2
      },
      {
        repositories,
        llmProvider: provider
      }
    );

    await expect(repositories.scores.listByRun(run.id)).resolves.toHaveLength(2);
    await expect(repositories.runEvents.listByRun(run.id)).resolves.toMatchObject([
      {
        step: "score_candidates",
        level: "error",
        message: "Failed to score candidate batch"
      }
    ]);
    expect(scores).toHaveLength(2);
  });
});

async function createScoringFixture(candidateCount: number) {
  const repositories = createInMemoryRepositories();
  await repositories.users.create(fixtureUserInput);
  await repositories.assistants.create(fixtureAssistantInput);
  await repositories.profiles.create(fixtureProfileInput);
  await repositories.papers.upsertMany(candidatePaperFixtures.slice(0, candidateCount));
  const run = await repositories.runs.create(fixtureRunInput);
  await repositories.candidates.insertMany(
    run.id,
    candidatePaperFixtures.slice(0, candidateCount).map((paper, index) => ({
      arxivId: paper.arxivId,
      candidateRank: index + 1,
      cheapScore: 0.9 - index * 0.1,
      candidateReason: `Candidate ${index + 1}`
    }))
  );

  return {
    repositories,
    run
  };
}

function scoreFor(arxivId: string, finalScore = 8.4) {
  return {
    arxiv_id: arxivId,
    topic_relevance: 8,
    technical_quality: 8,
    practical_value: 9,
    novelty: 7,
    final_score: finalScore,
    should_include: finalScore >= 7,
    reason: `Relevant candidate ${arxivId}`
  };
}
