import { DatabaseError } from "./errors";
import { createId } from "./ids";
import type { Repositories } from "./repositories";
import {
  DEFAULT_ARXIV_CATEGORIES,
  DEFAULT_WORKFLOW_VERSION,
  type ArxivPaper,
  type Assistant,
  type AssistantProfile,
  type AssistantRun,
  type Digest,
  type RunCandidate,
  type RunEvent,
  type RunScore,
  type User
} from "../domain/types";

interface InMemoryState {
  users: Map<string, User>;
  assistants: Map<string, Assistant>;
  profiles: Map<string, AssistantProfile>;
  papers: Map<string, ArxivPaper>;
  runs: Map<string, AssistantRun>;
  runEvents: Map<string, RunEvent>;
  candidates: Map<string, RunCandidate>;
  scores: Map<string, RunScore>;
  digests: Map<string, Digest>;
}

export function createInMemoryRepositories(): Repositories {
  const state: InMemoryState = {
    users: new Map(),
    assistants: new Map(),
    profiles: new Map(),
    papers: new Map(),
    runs: new Map(),
    runEvents: new Map(),
    candidates: new Map(),
    scores: new Map(),
    digests: new Map()
  };

  return {
    users: {
      async create(input) {
        const now = nowIso();
        const user: User = {
          id: input.id ?? createId(),
          email: input.email,
          displayName: input.displayName,
          createdAt: now,
          updatedAt: now
        };

        state.users.set(user.id, copy(user));
        return copy(user);
      },

      async getById(id) {
        return copyOrNull(state.users.get(id));
      }
    },

    assistants: {
      async listByUser(userId) {
        return [...state.assistants.values()]
          .filter((assistant) => assistant.userId === userId)
          .sort(descendingByCreatedAt)
          .map(copy);
      },

      async getById(id) {
        return copyOrNull(state.assistants.get(id));
      },

      async create(input) {
        assertExists(state.users, input.userId, "User does not exist");

        const now = nowIso();
        const assistant: Assistant = {
          id: input.id ?? createId(),
          userId: input.userId,
          name: input.name,
          description: input.description,
          arxivCategories: input.arxivCategories ?? [...DEFAULT_ARXIV_CATEGORIES],
          scheduleCron: input.scheduleCron,
          timezone: input.timezone ?? "UTC",
          paperCount: input.paperCount ?? 5,
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now
        };

        state.assistants.set(assistant.id, copy(assistant));
        return copy(assistant);
      },

      async update(id, input) {
        const existing = assertExists(state.assistants, id, "Assistant does not exist");
        const updated: Assistant = {
          ...existing,
          ...definedOnly({
            name: input.name,
            description: input.description,
            arxivCategories: input.arxivCategories,
            timezone: input.timezone,
            paperCount: input.paperCount,
            isActive: input.isActive
          }),
          updatedAt: nowIso()
        };

        if (input.scheduleCron !== undefined) {
          updated.scheduleCron = input.scheduleCron ?? undefined;
        }

        state.assistants.set(id, copy(updated));
        return copy(updated);
      }
    },

    profiles: {
      async getLatest(assistantId) {
        const latest = [...state.profiles.values()]
          .filter((profile) => profile.assistantId === assistantId)
          .sort((a, b) => b.version - a.version)[0];

        return copyOrNull(latest);
      },

      async getByVersion(assistantId, version) {
        const profile = [...state.profiles.values()].find(
          (candidate) =>
            candidate.assistantId === assistantId && candidate.version === version
        );

        return copyOrNull(profile);
      },

      async create(input) {
        assertExists(state.assistants, input.assistantId, "Assistant does not exist");

        const latest = [...state.profiles.values()]
          .filter((profile) => profile.assistantId === input.assistantId)
          .sort((a, b) => b.version - a.version)[0];
        const profile: AssistantProfile = {
          id: input.id ?? createId(),
          assistantId: input.assistantId,
          version: input.version ?? (latest?.version ?? 0) + 1,
          promptVersion: input.promptVersion,
          profile: input.profile,
          rawModelOutput: input.rawModelOutput,
          createdAt: nowIso()
        };

        ensureUnique(
          [...state.profiles.values()],
          (candidate) =>
            candidate.assistantId === profile.assistantId &&
            candidate.version === profile.version,
          "Assistant profile version already exists"
        );

        state.profiles.set(profile.id, copy(profile));
        return copy(profile);
      }
    },

    papers: {
      async upsertMany(papers) {
        const upserted = papers.map((paper) => {
          const existing = state.papers.get(paper.arxivId);
          const normalized: ArxivPaper = {
            ...paper,
            createdAt: existing?.createdAt ?? paper.createdAt ?? nowIso()
          };

          state.papers.set(paper.arxivId, copy(normalized));
          return normalized;
        });

        return upserted.map(copy);
      },

      async searchRecent(input) {
        const fromTime = startTime(input.fromDate);
        const toTime = endTime(input.toDate);
        const categorySet = new Set(input.categories);

        const results = [...state.papers.values()]
          .filter((paper) => {
            const publishedTime = Date.parse(paper.publishedAt);
            const inDateWindow = publishedTime >= fromTime && publishedTime <= toTime;
            const matchesCategory =
              categorySet.size === 0 ||
              paper.categories.some((category) => categorySet.has(category));

            return inDateWindow && matchesCategory;
          })
          .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

        return results.slice(0, input.limit).map(copy);
      },

      async getByIds(arxivIds) {
        return arxivIds
          .map((arxivId) => state.papers.get(arxivId))
          .filter((paper): paper is ArxivPaper => Boolean(paper))
          .map(copy);
      }
    },

    runs: {
      async create(input) {
        assertExists(state.assistants, input.assistantId, "Assistant does not exist");

        const now = nowIso();
        const run: AssistantRun = {
          id: input.id ?? createId(),
          assistantId: input.assistantId,
          profileId: input.profileId,
          status: input.status ?? "queued",
          triggerType: input.triggerType,
          requestedByUserId: input.requestedByUserId,
          workflowVersion: input.workflowVersion ?? DEFAULT_WORKFLOW_VERSION,
          createdAt: now,
          updatedAt: now
        };

        state.runs.set(run.id, copy(run));
        return copy(run);
      },

      async getById(id) {
        return copyOrNull(state.runs.get(id));
      },

      async listByAssistant(assistantId) {
        return [...state.runs.values()]
          .filter((run) => run.assistantId === assistantId)
          .sort(descendingByCreatedAt)
          .map(copy);
      },

      async updateStatus(input) {
        const existing = assertExists(state.runs, input.runId, "Run does not exist");
        const updated: AssistantRun = {
          ...existing,
          status: input.status,
          ...definedOnly({
            startedAt: input.startedAt,
            finishedAt: input.finishedAt,
            errorCode: input.errorCode,
            errorMessage: input.errorMessage
          }),
          updatedAt: nowIso()
        };

        state.runs.set(input.runId, copy(updated));
        return copy(updated);
      }
    },

    runEvents: {
      async append(input) {
        assertExists(state.runs, input.runId, "Run does not exist");

        const event: RunEvent = {
          id: input.id ?? createId(),
          runId: input.runId,
          step: input.step,
          level: input.level ?? "info",
          message: input.message,
          details: input.details ?? {},
          createdAt: nowIso()
        };

        state.runEvents.set(event.id, copy(event));
        return copy(event);
      },

      async listByRun(runId) {
        return [...state.runEvents.values()]
          .filter((event) => event.runId === runId)
          .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
          .map(copy);
      }
    },

    candidates: {
      async insertMany(runId, candidates) {
        assertExists(state.runs, runId, "Run does not exist");

        const inserted = candidates.map((candidate) => {
          assertExists(state.papers, candidate.arxivId, "arXiv paper does not exist");
          ensureUnique(
            [...state.candidates.values()],
            (existing) => existing.runId === runId && existing.arxivId === candidate.arxivId,
            "Run candidate already exists"
          );
          ensureUnique(
            [...state.candidates.values()],
            (existing) =>
              existing.runId === runId && existing.candidateRank === candidate.candidateRank,
            "Run candidate rank already exists"
          );

          const row: RunCandidate = {
            id: candidate.id ?? createId(),
            runId,
            arxivId: candidate.arxivId,
            candidateRank: candidate.candidateRank,
            cheapScore: candidate.cheapScore,
            candidateReason: candidate.candidateReason,
            source: candidate.source ?? {},
            createdAt: nowIso()
          };

          state.candidates.set(row.id, copy(row));
          return row;
        });

        return inserted.map(copy);
      },

      async listByRun(runId) {
        return [...state.candidates.values()]
          .filter((candidate) => candidate.runId === runId)
          .sort((a, b) => a.candidateRank - b.candidateRank)
          .map(copy);
      }
    },

    scores: {
      async insertMany(runId, scores) {
        assertExists(state.runs, runId, "Run does not exist");

        const inserted = scores.map((score) => {
          const hasCandidate = [...state.candidates.values()].some(
            (candidate) => candidate.runId === runId && candidate.arxivId === score.arxivId
          );

          if (!hasCandidate) {
            throw new DatabaseError("Run score requires an existing candidate");
          }

          ensureUnique(
            [...state.scores.values()],
            (existing) => existing.runId === runId && existing.arxivId === score.arxivId,
            "Run score already exists"
          );

          const row: RunScore = {
            id: score.id ?? createId(),
            runId,
            arxivId: score.arxivId,
            promptVersion: score.promptVersion,
            topicRelevance: score.topicRelevance,
            technicalQuality: score.technicalQuality,
            practicalValue: score.practicalValue,
            novelty: score.novelty,
            finalScore: score.finalScore,
            shouldInclude: score.shouldInclude,
            reason: score.reason,
            rawModelOutput: score.rawModelOutput,
            model: score.model,
            createdAt: nowIso()
          };

          state.scores.set(row.id, copy(row));
          return row;
        });

        return inserted.map(copy);
      },

      async listByRun(runId) {
        return [...state.scores.values()]
          .filter((score) => score.runId === runId)
          .sort((a, b) => b.finalScore - a.finalScore)
          .map(copy);
      }
    },

    digests: {
      async create(input) {
        assertExists(state.runs, input.runId, "Run does not exist");
        assertExists(state.assistants, input.assistantId, "Assistant does not exist");
        ensureUnique(
          [...state.digests.values()],
          (digest) => digest.runId === input.runId,
          "Digest already exists for run"
        );

        const now = nowIso();
        const digest: Digest = {
          id: input.id ?? createId(),
          runId: input.runId,
          assistantId: input.assistantId,
          markdown: input.markdown,
          html: input.html,
          selectedPapers: input.selectedPapers ?? [],
          candidateCount: input.candidateCount,
          qualityCheck: input.qualityCheck,
          digestPromptVersion: input.digestPromptVersion,
          qualityPromptVersion: input.qualityPromptVersion,
          rawDigestOutput: input.rawDigestOutput,
          rawQualityOutput: input.rawQualityOutput,
          emailStatus: input.emailStatus ?? "not_sent",
          emailProviderMessageId: input.emailProviderMessageId,
          createdAt: now,
          updatedAt: now
        };

        state.digests.set(digest.id, copy(digest));
        return copy(digest);
      },

      async getByRunId(runId) {
        return copyOrNull([...state.digests.values()].find((digest) => digest.runId === runId));
      },

      async getById(id) {
        return copyOrNull(state.digests.get(id));
      },

      async listByAssistant(assistantId) {
        return [...state.digests.values()]
          .filter((digest) => digest.assistantId === assistantId)
          .sort(descendingByCreatedAt)
          .map(copy);
      },

      async updateEmailStatus(input) {
        const existing = assertExists(state.digests, input.digestId, "Digest does not exist");
        const updated: Digest = {
          ...existing,
          emailStatus: input.emailStatus,
          emailProviderMessageId: input.emailProviderMessageId,
          updatedAt: nowIso()
        };

        state.digests.set(input.digestId, copy(updated));
        return copy(updated);
      }
    }
  };
}

function assertExists<T>(map: Map<string, T>, id: string, message: string): T {
  const value = map.get(id);

  if (!value) {
    throw new DatabaseError(message);
  }

  return value;
}

function ensureUnique<T>(items: T[], predicate: (item: T) => boolean, message: string): void {
  if (items.some(predicate)) {
    throw new DatabaseError(message);
  }
}

function definedOnly<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

function copyOrNull<T>(value: T | undefined): T | null {
  return value ? copy(value) : null;
}

function descendingByCreatedAt(
  a: { createdAt: string },
  b: { createdAt: string }
): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

function startTime(value: string): number {
  return Date.parse(value);
}

function endTime(value: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Date.parse(`${value}T23:59:59.999Z`);
  }

  return Date.parse(value);
}

function nowIso(): string {
  return new Date().toISOString();
}
