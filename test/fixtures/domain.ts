import type {
  ArxivPaper,
  CreateAssistantInput,
  CreateAssistantProfileInput,
  CreateAssistantRunInput,
  CreateUserInput
} from "../../src/domain/types";

export const fixtureIds = {
  user: "00000000-0000-4000-8000-000000000001",
  assistant: "00000000-0000-4000-8000-000000000002",
  profile: "00000000-0000-4000-8000-000000000003",
  run: "00000000-0000-4000-8000-000000000004"
};

export const fixtureUserInput: CreateUserInput = {
  id: fixtureIds.user,
  email: "researcher@example.com",
  displayName: "Researcher"
};

export const fixtureAssistantInput: CreateAssistantInput = {
  id: fixtureIds.assistant,
  userId: fixtureIds.user,
  name: "Agent Papers",
  description: "Find practical papers about AI agents, tool use, RAG, and evaluation.",
  arxivCategories: ["cs.AI", "cs.CL"],
  scheduleCron: "0 8 * * 1",
  timezone: "America/Los_Angeles",
  paperCount: 5
};

export const fixtureProfileInput: CreateAssistantProfileInput = {
  id: fixtureIds.profile,
  assistantId: fixtureIds.assistant,
  promptVersion: "profile-compiler-v1",
  profile: {
    include_topics: ["AI agents", "tool use", "RAG"],
    exclude_topics: ["pure theory"],
    positive_signals: ["benchmark", "code"],
    negative_signals: ["no experiments"],
    scoring_rubric: {
      topic_relevance: 0.35,
      technical_quality: 0.25,
      practical_value: 0.25,
      novelty: 0.15
    }
  },
  rawModelOutput: {
    provider: "mock",
    text: "fixture"
  }
};

export const fixtureRunInput: CreateAssistantRunInput = {
  id: fixtureIds.run,
  assistantId: fixtureIds.assistant,
  profileId: fixtureIds.profile,
  triggerType: "manual",
  requestedByUserId: fixtureIds.user
};

export const fixturePapers: ArxivPaper[] = [
  {
    arxivId: "2604.00001",
    title: "Practical Tool Use for Research Agents",
    abstract: "A benchmark-driven study of tool-using AI agents for research workflows.",
    authors: ["Ada Lovelace", "Grace Hopper"],
    categories: ["cs.AI", "cs.CL"],
    primaryCategory: "cs.AI",
    publishedAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-04-21T10:00:00.000Z",
    pdfUrl: "https://arxiv.org/pdf/2604.00001",
    absUrl: "https://arxiv.org/abs/2604.00001",
    metadata: {
      fixture: true
    }
  },
  {
    arxivId: "2604.00002",
    title: "Retrieval Evaluation for Language Models",
    abstract: "Evaluation methods for retrieval augmented generation in language models.",
    authors: ["Katherine Johnson"],
    categories: ["cs.CL"],
    primaryCategory: "cs.CL",
    publishedAt: "2026-04-18T10:00:00.000Z",
    pdfUrl: "https://arxiv.org/pdf/2604.00002",
    absUrl: "https://arxiv.org/abs/2604.00002",
    metadata: {
      fixture: true
    }
  }
];
