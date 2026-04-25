import { createInMemoryRepositories } from "../../src/db/memory";
import {
  fixtureAssistantInput,
  fixtureProfileInput,
  fixtureUserInput
} from "./domain";
import { candidatePaperFixtures } from "./papers";

export async function createWorkflowRepositories() {
  const repositories = createInMemoryRepositories();
  await repositories.users.create(fixtureUserInput);
  await repositories.assistants.create(fixtureAssistantInput);
  await repositories.profiles.create(fixtureProfileInput);
  await repositories.papers.upsertMany(candidatePaperFixtures.slice(0, 2));

  return repositories;
}

export function scoringResponse(arxivIds: string[]) {
  return {
    scores: arxivIds.map((arxivId, index) => ({
      arxiv_id: arxivId,
      topic_relevance: 8,
      technical_quality: 8,
      practical_value: 9,
      novelty: 7,
      final_score: 8.5 - index,
      should_include: true,
      reason: `Strong match ${arxivId}`
    }))
  };
}

export function digestResponse(
  markdown = "# Agent Papers\n\nSelected from 2 recent papers.\n\n## 1. Practical Tool Use for Research Agents\n\nAuthors: Ada Lovelace, Grace Hopper\nLink: https://arxiv.org/abs/2604.10001\n\nKey idea:\nA practical agent paper.\n\nWhy this matches:\nIt matches the configured assistant.\n\nPotential limitations:\nOnly title and abstract were considered."
) {
  return {
    markdown
  };
}

export function qualityResponse(passed: boolean) {
  return {
    passed,
    issues: [],
    suggested_fixes: []
  };
}
