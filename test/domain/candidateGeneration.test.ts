import { describe, expect, it } from "vitest";

import {
  generateCandidates,
  normalizeCandidateLimit,
  scoreCandidatePaper,
  type CandidateProfileTerms
} from "../../src/domain/candidateGeneration";
import { createInMemoryRepositories } from "../../src/db/memory";
import {
  fixtureAssistantInput,
  fixtureProfileInput,
  fixtureRunInput,
  fixtureUserInput
} from "../fixtures/domain";
import { candidatePaperFixtures, paperFixture } from "../fixtures/papers";

const profileTerms: CandidateProfileTerms = {
  includeTopics: ["AI agents", "tool use", "RAG"],
  excludeTopics: ["pure theory"],
  positiveSignals: ["benchmark", "code"],
  negativeSignals: ["no experiments"]
};

describe("scoreCandidatePaper", () => {
  it("increases score for include topic and positive signal matches", () => {
    const strong = scoreCandidatePaper({
      paper: candidatePaperFixtures[0],
      profileTerms,
      preferredCategories: ["cs.AI"],
      fromDate: "2026-04-01",
      toDate: "2026-04-25"
    });
    const weak = scoreCandidatePaper({
      paper: candidatePaperFixtures[0],
      profileTerms: {
        ...profileTerms,
        includeTopics: ["quantum hardware"],
        positiveSignals: ["survey"]
      },
      preferredCategories: ["cs.AI"],
      fromDate: "2026-04-01",
      toDate: "2026-04-25"
    });

    expect(strong.cheapScore).toBeGreaterThan(weak.cheapScore);
    expect(strong.matchedIncludeTopics).toEqual(["AI agents", "tool use"]);
    expect(strong.matchedPositiveSignals).toEqual(["benchmark", "code"]);
  });

  it("reduces score when exclude topics and negative signals match", () => {
    const mixedPaper = paperFixture({
      arxivId: "2604.20003",
      title: "AI Agents and Pure Theory",
      abstract: "AI agents with pure theory and no experiments.",
      publishedAt: "2026-04-23T00:00:00.000Z"
    });
    const penalized = scoreCandidatePaper({
      paper: mixedPaper,
      profileTerms,
      preferredCategories: ["cs.AI"],
      fromDate: "2026-04-01",
      toDate: "2026-04-25"
    });
    const unpenalized = scoreCandidatePaper({
      paper: mixedPaper,
      profileTerms: {
        ...profileTerms,
        excludeTopics: [],
        negativeSignals: []
      },
      preferredCategories: ["cs.AI"],
      fromDate: "2026-04-01",
      toDate: "2026-04-25"
    });

    expect(penalized.cheapScore).toBeLessThan(unpenalized.cheapScore);
    expect(penalized.matchedExcludeTopics).toEqual(["pure theory"]);
    expect(penalized.matchedNegativeSignals).toEqual(["no experiments"]);
  });

  it("uses recency as part of the score", () => {
    const newer = scoreCandidatePaper({
      paper: paperFixture({
        arxivId: "2604.20001",
        title: "AI Agents for Tool Use",
        abstract: "AI agents for tool use.",
        publishedAt: "2026-04-24T00:00:00.000Z"
      }),
      profileTerms,
      preferredCategories: ["cs.AI"],
      fromDate: "2026-04-01",
      toDate: "2026-04-25"
    });
    const older = scoreCandidatePaper({
      paper: paperFixture({
        arxivId: "2604.20002",
        title: "AI Agents for Tool Use",
        abstract: "AI agents for tool use.",
        publishedAt: "2026-04-02T00:00:00.000Z"
      }),
      profileTerms,
      preferredCategories: ["cs.AI"],
      fromDate: "2026-04-01",
      toDate: "2026-04-25"
    });

    expect(newer.recencyScore).toBeGreaterThan(older.recencyScore);
    expect(newer.cheapScore).toBeGreaterThan(older.cheapScore);
  });

  it("generates deterministic candidate reasons", () => {
    const scored = scoreCandidatePaper({
      paper: candidatePaperFixtures[0],
      profileTerms,
      preferredCategories: ["cs.AI"],
      fromDate: "2026-04-01",
      toDate: "2026-04-25"
    });

    expect(scored.candidateReason).toBe(
      "Matched include topics: AI agents, tool use. Positive signals: benchmark, code. Primary category cs.AI."
    );
  });
});

describe("generateCandidates", () => {
  it("returns stable ranked candidates and persists them", async () => {
    const { repositories, run } = await createCandidateFixture();

    const candidates = await generateCandidates(
      {
        runId: run.id,
        assistantId: fixtureAssistantInput.id!,
        profileVersion: 1,
        categories: ["cs.AI", "cs.CL"],
        fromDate: "2026-04-01",
        toDate: "2026-04-25"
      },
      {
        repositories
      }
    );

    expect(candidates.map((candidate) => candidate.arxivId)).toEqual([
      "2604.10001",
      "2604.10002",
      "2604.10004",
      "2604.10003"
    ]);
    expect(candidates.map((candidate) => candidate.candidateRank)).toEqual([1, 2, 3, 4]);
    await expect(repositories.candidates.listByRun(run.id)).resolves.toHaveLength(4);
  });

  it("enforces candidate caps", async () => {
    const repositories = createInMemoryRepositories();
    await repositories.users.create(fixtureUserInput);
    await repositories.assistants.create(fixtureAssistantInput);
    await repositories.profiles.create(fixtureProfileInput);
    const run = await repositories.runs.create(fixtureRunInput);
    const papers = Array.from({ length: 120 }, (_, index) =>
      paperFixture({
        arxivId: `2604.${(30000 + index).toString()}`,
        title: `AI Agents for Tool Use ${index}`,
        abstract: "AI agents with benchmark and code.",
        publishedAt: "2026-04-20T00:00:00.000Z"
      })
    );
    await repositories.papers.upsertMany(papers);

    const candidates = await generateCandidates(
      {
        runId: run.id,
        assistantId: fixtureAssistantInput.id!,
        profileVersion: 1,
        categories: ["cs.AI"],
        fromDate: "2026-04-01",
        toDate: "2026-04-25",
        limit: 200
      },
      { repositories }
    );

    expect(candidates).toHaveLength(100);
    expect(normalizeCandidateLimit(5)).toBe(10);
    expect(normalizeCandidateLimit(200)).toBe(100);
  });
});

async function createCandidateFixture() {
  const repositories = createInMemoryRepositories();
  await repositories.users.create(fixtureUserInput);
  await repositories.assistants.create(fixtureAssistantInput);
  await repositories.profiles.create(fixtureProfileInput);
  await repositories.papers.upsertMany(candidatePaperFixtures);
  const run = await repositories.runs.create(fixtureRunInput);

  return {
    repositories,
    run
  };
}
