import type { ArxivPaper } from "../../src/domain/types";

export function paperFixture(overrides: Partial<ArxivPaper> & { arxivId: string }): ArxivPaper {
  return {
    title: "Untitled Paper",
    abstract: "A paper about machine learning.",
    authors: ["Researcher"],
    categories: ["cs.AI"],
    primaryCategory: "cs.AI",
    publishedAt: "2026-04-20T00:00:00.000Z",
    absUrl: `https://arxiv.org/abs/${overrides.arxivId}`,
    metadata: {},
    ...overrides
  };
}

export const candidatePaperFixtures: ArxivPaper[] = [
  paperFixture({
    arxivId: "2604.10001",
    title: "Benchmarking Tool Use for AI Agents",
    abstract: "A practical benchmark with code for reliable tool use in AI agents.",
    publishedAt: "2026-04-24T00:00:00.000Z",
    categories: ["cs.AI", "cs.CL"],
    primaryCategory: "cs.AI"
  }),
  paperFixture({
    arxivId: "2604.10002",
    title: "RAG Evaluation for Research Workflows",
    abstract: "Retrieval augmented generation evaluation for language model systems.",
    publishedAt: "2026-04-22T00:00:00.000Z",
    categories: ["cs.CL"],
    primaryCategory: "cs.CL"
  }),
  paperFixture({
    arxivId: "2604.10003",
    title: "Pure Theory of Abstract Agents",
    abstract: "A pure theory paper with no experiments and limited practical evaluation.",
    publishedAt: "2026-04-23T00:00:00.000Z",
    categories: ["cs.AI"],
    primaryCategory: "cs.AI"
  }),
  paperFixture({
    arxivId: "2604.10004",
    title: "Older Code Agents",
    abstract: "Code-focused AI agents for tool use.",
    publishedAt: "2026-04-02T00:00:00.000Z",
    categories: ["cs.AI"],
    primaryCategory: "cs.AI"
  })
];
