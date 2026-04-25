import { describe, expect, it } from "vitest";

import { createInMemoryRepositories } from "../../src/db/memory";
import {
  fixtureAssistantInput,
  fixturePapers,
  fixtureProfileInput,
  fixtureRunInput,
  fixtureUserInput
} from "../fixtures/domain";

async function createSeededRepositories() {
  const repositories = createInMemoryRepositories();
  const user = await repositories.users.create(fixtureUserInput);
  const assistant = await repositories.assistants.create(fixtureAssistantInput);

  return {
    repositories,
    user,
    assistant
  };
}

describe("in-memory repositories", () => {
  it("creates, lists, gets, and updates assistants", async () => {
    const { repositories, user, assistant } = await createSeededRepositories();

    await expect(repositories.assistants.listByUser(user.id)).resolves.toEqual([assistant]);
    await expect(repositories.assistants.getById(assistant.id)).resolves.toEqual(assistant);

    const updated = await repositories.assistants.update(assistant.id, {
      name: "Updated Agent Papers",
      paperCount: 7,
      scheduleCron: null
    });

    expect(updated).toMatchObject({
      id: assistant.id,
      name: "Updated Agent Papers",
      paperCount: 7,
      scheduleCron: undefined
    });
    expect(updated.updatedAt >= assistant.updatedAt).toBe(true);
  });

  it("inserts profile versions and returns the latest profile", async () => {
    const { repositories, assistant } = await createSeededRepositories();

    const first = await repositories.profiles.create(fixtureProfileInput);
    const second = await repositories.profiles.create({
      ...fixtureProfileInput,
      id: undefined,
      promptVersion: "profile-compiler-v2",
      rawModelOutput: {
        provider: "mock",
        text: "second"
      }
    });

    const latest = await repositories.profiles.getLatest(assistant.id);

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(latest).toMatchObject({
      id: second.id,
      version: 2,
      promptVersion: "profile-compiler-v2"
    });
  });

  it("upserts papers idempotently and searches by recency and category", async () => {
    const { repositories } = await createSeededRepositories();

    await repositories.papers.upsertMany(fixturePapers);
    await repositories.papers.upsertMany([
      {
        ...fixturePapers[0],
        title: "Updated Practical Tool Use for Research Agents"
      },
      fixturePapers[1]
    ]);

    const papers = await repositories.papers.searchRecent({
      categories: ["cs.AI"],
      fromDate: "2026-04-01",
      toDate: "2026-04-25"
    });

    expect(papers).toHaveLength(1);
    expect(papers[0]).toMatchObject({
      arxivId: "2604.00001",
      title: "Updated Practical Tool Use for Research Agents"
    });
  });

  it("creates runs, updates status, and appends ordered events", async () => {
    const { repositories } = await createSeededRepositories();
    const profile = await repositories.profiles.create(fixtureProfileInput);
    const run = await repositories.runs.create({
      ...fixtureRunInput,
      profileId: profile.id
    });

    const running = await repositories.runs.updateStatus({
      runId: run.id,
      status: "running",
      startedAt: "2026-04-25T09:00:00.000Z"
    });

    await repositories.runEvents.append({
      runId: run.id,
      step: "load_assistant_config",
      message: "Loaded assistant"
    });
    await repositories.runEvents.append({
      runId: run.id,
      step: "retrieve_candidates",
      level: "warn",
      message: "No cached papers matched",
      details: {
        candidate_count: 0
      }
    });

    const events = await repositories.runEvents.listByRun(run.id);

    expect(running).toMatchObject({
      status: "running",
      startedAt: "2026-04-25T09:00:00.000Z"
    });
    expect(events.map((event) => event.step)).toEqual([
      "load_assistant_config",
      "retrieve_candidates"
    ]);
    expect(events[1].details).toEqual({
      candidate_count: 0
    });
  });

  it("inserts candidates and scores for a run", async () => {
    const { repositories } = await createSeededRepositories();
    const profile = await repositories.profiles.create(fixtureProfileInput);
    const run = await repositories.runs.create({
      ...fixtureRunInput,
      profileId: profile.id
    });
    await repositories.papers.upsertMany(fixturePapers);

    const candidates = await repositories.candidates.insertMany(run.id, [
      {
        arxivId: "2604.00001",
        candidateRank: 1,
        cheapScore: 0.92,
        candidateReason: "Matched include topics: AI agents. Primary category cs.AI."
      },
      {
        arxivId: "2604.00002",
        candidateRank: 2,
        cheapScore: 0.75,
        candidateReason: "Matched include topics: RAG. Primary category cs.CL."
      }
    ]);
    const scores = await repositories.scores.insertMany(run.id, [
      {
        arxivId: "2604.00001",
        promptVersion: "candidate-scoring-v1",
        topicRelevance: 9,
        technicalQuality: 8,
        practicalValue: 9,
        novelty: 7,
        finalScore: 8.4,
        shouldInclude: true,
        reason: "Strong practical agent benchmark match.",
        rawModelOutput: {
          scores: []
        },
        model: "mock"
      }
    ]);

    await expect(repositories.candidates.listByRun(run.id)).resolves.toEqual(candidates);
    await expect(repositories.scores.listByRun(run.id)).resolves.toEqual(scores);
  });

  it("creates and looks up digests by run", async () => {
    const { repositories, assistant } = await createSeededRepositories();
    const profile = await repositories.profiles.create(fixtureProfileInput);
    const run = await repositories.runs.create({
      ...fixtureRunInput,
      profileId: profile.id
    });

    const digest = await repositories.digests.create({
      runId: run.id,
      assistantId: assistant.id,
      markdown: "# Agent Papers\n\nSelected from 2 recent papers.",
      html: "<h1>Agent Papers</h1><p>Selected from 2 recent papers.</p>",
      selectedPapers: [
        {
          arxiv_id: "2604.00001",
          rank: 1
        }
      ],
      candidateCount: 2,
      qualityCheck: {
        passed: true,
        issues: []
      },
      digestPromptVersion: "digest-generation-v1",
      qualityPromptVersion: "quality-check-v1",
      rawDigestOutput: {
        markdown: "# Agent Papers"
      },
      rawQualityOutput: {
        passed: true
      },
      emailStatus: "skipped"
    });

    await expect(repositories.digests.getByRunId(run.id)).resolves.toEqual(digest);
    await expect(repositories.digests.listByAssistant(assistant.id)).resolves.toEqual([
      digest
    ]);
  });
});
