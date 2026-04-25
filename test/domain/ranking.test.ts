import { describe, expect, it } from "vitest";

import { createInMemoryRepositories } from "../../src/db/memory";
import { selectPapers } from "../../src/domain/ranking";
import {
  fixtureAssistantInput,
  fixtureProfileInput,
  fixtureRunInput,
  fixtureUserInput
} from "../fixtures/domain";
import { paperFixture } from "../fixtures/papers";

describe("selectPapers", () => {
  it("drops scores below threshold when enough papers remain", async () => {
    const repositories = await createRankingRepositories([
      rankingPaper("2604.40001", "AI Agents Benchmark", "AI agents benchmark.", 8.8),
      rankingPaper("2604.40002", "RAG Evaluation", "RAG evaluation.", 7.2),
      rankingPaper("2604.40003", "Weak Match", "Weak match.", 6.1)
    ]);

    const selected = await selectPapers(
      {
        runId: fixtureRunInput.id!,
        assistantId: fixtureAssistantInput.id!,
        paperCount: 2
      },
      { repositories }
    );

    expect(selected.map((paper) => paper.arxivId)).toEqual(["2604.40001", "2604.40002"]);
  });

  it("removes near-duplicate titles", async () => {
    const repositories = await createRankingRepositories([
      rankingPaper("2604.41001", "AI Agents Benchmark", "AI agents benchmark.", 9.1),
      rankingPaper("2604.41002", "AI Agents Benchmark", "Duplicate title.", 8.9),
      rankingPaper("2604.41003", "RAG Evaluation", "RAG evaluation.", 8.1)
    ]);

    const selected = await selectPapers(
      {
        runId: fixtureRunInput.id!,
        assistantId: fixtureAssistantInput.id!,
        paperCount: 3
      },
      { repositories }
    );

    expect(selected.map((paper) => paper.arxivId)).toEqual(["2604.41001", "2604.41003"]);
  });

  it("limits each topic bucket before filling by score", async () => {
    const repositories = await createRankingRepositories([
      rankingPaper("2604.42001", "Agent Paper 1", "AI agents.", 9.0, "AI agents"),
      rankingPaper("2604.42002", "Agent Paper 2", "AI agents.", 8.9, "AI agents"),
      rankingPaper("2604.42003", "Agent Paper 3", "AI agents.", 8.8, "AI agents"),
      rankingPaper("2604.42004", "RAG Paper", "RAG.", 8.7, "RAG")
    ]);

    const selected = await selectPapers(
      {
        runId: fixtureRunInput.id!,
        assistantId: fixtureAssistantInput.id!,
        paperCount: 3
      },
      { repositories }
    );

    expect(selected.map((paper) => paper.arxivId)).toEqual([
      "2604.42001",
      "2604.42002",
      "2604.42004"
    ]);
  });
});

async function createRankingRepositories(
  papers: Array<ReturnType<typeof rankingPaper>>
) {
  const repositories = createInMemoryRepositories();
  await repositories.users.create(fixtureUserInput);
  await repositories.assistants.create(fixtureAssistantInput);
  await repositories.profiles.create(fixtureProfileInput);
  await repositories.papers.upsertMany(papers.map((paper) => paper.paper));
  await repositories.runs.create(fixtureRunInput);
  await repositories.candidates.insertMany(
    fixtureRunInput.id!,
    papers.map((paper, index) => ({
      arxivId: paper.paper.arxivId,
      candidateRank: index + 1,
      cheapScore: 0.9 - index * 0.01,
      candidateReason: "Ranking fixture",
      source: {
        matched_include_topics: [paper.bucket]
      }
    }))
  );
  await repositories.scores.insertMany(
    fixtureRunInput.id!,
    papers.map((paper) => ({
      arxivId: paper.paper.arxivId,
      promptVersion: "candidate-scoring-v1",
      topicRelevance: 8,
      technicalQuality: 8,
      practicalValue: 8,
      novelty: 8,
      finalScore: paper.finalScore,
      shouldInclude: true,
      reason: `Selected because ${paper.paper.title}`,
      rawModelOutput: {},
      model: "mock"
    }))
  );

  return repositories;
}

function rankingPaper(
  arxivId: string,
  title: string,
  abstract: string,
  finalScore: number,
  bucket = "AI agents"
) {
  return {
    paper: paperFixture({
      arxivId,
      title,
      abstract,
      categories: ["cs.AI"],
      primaryCategory: "cs.AI"
    }),
    finalScore,
    bucket
  };
}
