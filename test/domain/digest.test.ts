import { describe, expect, it } from "vitest";

import { createInMemoryRepositories } from "../../src/db/memory";
import {
  assertDigestDoesNotClaimFullText,
  generateAndSaveDigest,
  markdownToHtml
} from "../../src/domain/digest";
import { MockLlmProvider } from "../../src/llm";
import {
  fixtureAssistantInput,
  fixtureProfileInput,
  fixtureRunInput,
  fixtureUserInput
} from "../fixtures/domain";
import { candidatePaperFixtures } from "../fixtures/papers";

describe("generateAndSaveDigest", () => {
  it("saves markdown and HTML with required digest sections", async () => {
    const repositories = await createDigestRepositories();
    const markdown = validDigestMarkdown();
    const provider = new MockLlmProvider([digestResponse(markdown), qualityResponse(true)]);

    const digest = await generateAndSaveDigest(
      {
        runId: fixtureRunInput.id!,
        assistantId: fixtureAssistantInput.id!,
        paperCount: 2
      },
      {
        repositories,
        llmProvider: provider
      }
    );

    expect(digest.markdown).toContain("Key idea:");
    expect(digest.markdown).toContain("Why this matches:");
    expect(digest.markdown).toContain("Potential limitations:");
    expect(digest.html).toContain("<h1>Agent Papers</h1>");
    expect(digest.digestPromptVersion).toBe("digest-generation-v1");
    expect(digest.qualityPromptVersion).toBe("quality-check-v1");
    await expect(repositories.digests.getByRunId(fixtureRunInput.id!)).resolves.toEqual(
      digest
    );
  });

  it("regenerates at most once after quality failure", async () => {
    const repositories = await createDigestRepositories();
    const provider = new MockLlmProvider([
      digestResponse("# Bad digest"),
      qualityResponse(false, ["Missing required sections"], ["Use the required format"]),
      digestResponse(validDigestMarkdown("Regenerated Agent Papers")),
      qualityResponse(true)
    ]);

    const digest = await generateAndSaveDigest(
      {
        runId: fixtureRunInput.id!,
        assistantId: fixtureAssistantInput.id!,
        paperCount: 2
      },
      {
        repositories,
        llmProvider: provider
      }
    );

    expect(provider.calls).toHaveLength(4);
    expect(digest.markdown).toContain("Regenerated Agent Papers");
    expect(digest.qualityCheck).toEqual({
      passed: true,
      issues: [],
      suggested_fixes: []
    });
  });

  it("rejects full-text review claims", async () => {
    const repositories = await createDigestRepositories();
    const provider = new MockLlmProvider([
      digestResponse(`${validDigestMarkdown()}\n\nAfter reading the full paper, this is definitive.`),
      qualityResponse(true)
    ]);

    await expect(
      generateAndSaveDigest(
        {
          runId: fixtureRunInput.id!,
          assistantId: fixtureAssistantInput.id!,
          paperCount: 2
        },
        {
          repositories,
          llmProvider: provider
        }
      )
    ).rejects.toThrow(/full-text or full-PDF/);
  });
});

describe("markdownToHtml", () => {
  it("renders markdown headings to HTML", () => {
    expect(markdownToHtml("# Agent Papers")).toContain("<h1>Agent Papers</h1>");
  });
});

describe("assertDigestDoesNotClaimFullText", () => {
  it("allows abstract-only wording", () => {
    expect(() =>
      assertDigestDoesNotClaimFullText("Based on the title and abstract, this is useful.")
    ).not.toThrow();
  });
});

async function createDigestRepositories() {
  const repositories = createInMemoryRepositories();
  await repositories.users.create(fixtureUserInput);
  await repositories.assistants.create(fixtureAssistantInput);
  await repositories.profiles.create(fixtureProfileInput);
  await repositories.papers.upsertMany(candidatePaperFixtures.slice(0, 2));
  await repositories.runs.create(fixtureRunInput);
  await repositories.candidates.insertMany(
    fixtureRunInput.id!,
    candidatePaperFixtures.slice(0, 2).map((paper, index) => ({
      arxivId: paper.arxivId,
      candidateRank: index + 1,
      cheapScore: 0.9 - index * 0.1,
      candidateReason: "Digest candidate",
      source: {
        matched_include_topics: index === 0 ? ["AI agents"] : ["RAG"]
      }
    }))
  );
  await repositories.scores.insertMany(
    fixtureRunInput.id!,
    candidatePaperFixtures.slice(0, 2).map((paper, index) => ({
      arxivId: paper.arxivId,
      promptVersion: "candidate-scoring-v1",
      topicRelevance: 8,
      technicalQuality: 8,
      practicalValue: 8,
      novelty: 8,
      finalScore: 8.5 - index,
      shouldInclude: true,
      reason: "Strong match for the assistant criteria.",
      rawModelOutput: {},
      model: "mock"
    }))
  );

  return repositories;
}

function validDigestMarkdown(title = "Agent Papers"): string {
  return [
    `# ${title}`,
    "",
    "Selected from 2 recent papers.",
    "",
    "## 1. Practical Tool Use for Research Agents",
    "",
    "Authors: Ada Lovelace, Grace Hopper",
    "Link: https://arxiv.org/abs/2604.10001",
    "",
    "Key idea:",
    "A benchmark-driven look at tool-using AI agents.",
    "",
    "Why this matches:",
    "It directly targets practical AI agent evaluation.",
    "",
    "Potential limitations:",
    "The abstract may not reveal deployment constraints."
  ].join("\n");
}

function digestResponse(markdown: string) {
  return {
    markdown
  };
}

function qualityResponse(passed: boolean, issues: string[] = [], suggestedFixes: string[] = []) {
  return {
    passed,
    issues,
    suggested_fixes: suggestedFixes
  };
}
