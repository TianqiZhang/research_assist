import { DatabaseError, assertFound } from "./errors";
import { createId } from "./ids";
import type { Repositories } from "./repositories";
import type { ResearchSupabaseClient } from "./supabase";
import {
  arxivPaperFromRow,
  assistantFromRow,
  assistantProfileFromRow,
  assistantRunFromRow,
  digestFromRow,
  runCandidateFromRow,
  runEventFromRow,
  runScoreFromRow,
  userFromRow,
  type ArxivPaperRow,
  type AssistantProfileRow,
  type AssistantRow,
  type AssistantRunRow,
  type DigestRow,
  type RunCandidateRow,
  type RunEventRow,
  type RunScoreRow,
  type UserRow
} from "./schema";
import {
  DEFAULT_ARXIV_CATEGORIES,
  DEFAULT_WORKFLOW_VERSION,
  type AppendRunEventInput,
  type ArxivPaper,
  type CreateAssistantInput,
  type CreateAssistantProfileInput,
  type CreateAssistantRunInput,
  type CreateDigestInput,
  type CreateUserInput,
  type InsertRunCandidateInput,
  type InsertRunScoreInput,
  type JsonObject,
  type SearchRecentPapersInput,
  type UpdateAssistantInput,
  type UpdateRunStatusInput
} from "../domain/types";

export function createSupabaseRepositories(client: ResearchSupabaseClient): Repositories {
  return {
    users: {
      async create(input) {
        const row = await insertSingle<UserRow>(client, "users", {
          id: input.id ?? createId(),
          email: input.email,
          display_name: input.displayName ?? null
        });

        return userFromRow(row);
      },

      async getById(id) {
        const row = await maybeSingle<UserRow>(
          client
            .from("users")
            .select("*")
            .eq("id", id)
            .maybeSingle(),
          "get user"
        );

        return row ? userFromRow(row) : null;
      }
    },

    assistants: {
      async listByUser(userId) {
        const rows = await many<AssistantRow>(
          client
            .from("assistants")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          "list assistants"
        );

        return rows.map(assistantFromRow);
      },

      async getById(id) {
        const row = await maybeSingle<AssistantRow>(
          client
            .from("assistants")
            .select("*")
            .eq("id", id)
            .maybeSingle(),
          "get assistant"
        );

        return row ? assistantFromRow(row) : null;
      },

      async create(input) {
        const row = await insertSingle<AssistantRow>(client, "assistants", {
          id: input.id ?? createId(),
          user_id: input.userId,
          name: input.name,
          description: input.description,
          arxiv_categories: input.arxivCategories ?? [...DEFAULT_ARXIV_CATEGORIES],
          schedule_cron: input.scheduleCron ?? null,
          timezone: input.timezone ?? "UTC",
          paper_count: input.paperCount ?? 5,
          is_active: input.isActive ?? true
        });

        return assistantFromRow(row);
      },

      async update(id, input) {
        const patch: Record<string, unknown> = {
          updated_at: nowIso()
        };

        if (input.name !== undefined) patch.name = input.name;
        if (input.description !== undefined) patch.description = input.description;
        if (input.arxivCategories !== undefined) patch.arxiv_categories = input.arxivCategories;
        if (input.scheduleCron !== undefined) patch.schedule_cron = input.scheduleCron;
        if (input.timezone !== undefined) patch.timezone = input.timezone;
        if (input.paperCount !== undefined) patch.paper_count = input.paperCount;
        if (input.isActive !== undefined) patch.is_active = input.isActive;

        const row = await single<AssistantRow>(
          client
            .from("assistants")
            .update(patch)
            .eq("id", id)
            .select("*")
            .single(),
          "update assistant"
        );

        return assistantFromRow(row);
      }
    },

    profiles: {
      async getLatest(assistantId) {
        const row = await maybeSingle<AssistantProfileRow>(
          client
            .from("assistant_profiles")
            .select("*")
            .eq("assistant_id", assistantId)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle(),
          "get latest assistant profile"
        );

        return row ? assistantProfileFromRow(row) : null;
      },

      async getByVersion(assistantId, version) {
        const row = await maybeSingle<AssistantProfileRow>(
          client
            .from("assistant_profiles")
            .select("*")
            .eq("assistant_id", assistantId)
            .eq("version", version)
            .maybeSingle(),
          "get assistant profile by version"
        );

        return row ? assistantProfileFromRow(row) : null;
      },

      async create(input) {
        const latest = await getLatestProfileRow(client, input.assistantId);
        const version =
          input.version ??
          (latest?.version ?? 0) + 1;

        const row = await insertSingle<AssistantProfileRow>(client, "assistant_profiles", {
          id: input.id ?? createId(),
          assistant_id: input.assistantId,
          version,
          prompt_version: input.promptVersion,
          profile_json: input.profile,
          raw_model_output: input.rawModelOutput
        });

        return assistantProfileFromRow(row);
      }
    },

    papers: {
      async upsertMany(papers) {
        if (papers.length === 0) {
          return [];
        }

        const rows = await many<ArxivPaperRow>(
          client
            .from("arxiv_papers")
            .upsert(
              papers.map((paper) => ({
                arxiv_id: paper.arxivId,
                title: paper.title,
                abstract: paper.abstract,
                authors: paper.authors,
                categories: paper.categories,
                primary_category: paper.primaryCategory ?? null,
                published_at: paper.publishedAt,
                updated_at: paper.updatedAt ?? null,
                pdf_url: paper.pdfUrl ?? null,
                abs_url: paper.absUrl,
                metadata: paper.metadata,
                cached_at: nowIso()
              })),
              { onConflict: "arxiv_id" }
            )
            .select("*"),
          "upsert arxiv papers"
        );

        return rows.map(arxivPaperFromRow);
      },

      async searchRecent(input) {
        let query = client
          .from("arxiv_papers")
          .select("*")
          .gte("published_at", input.fromDate)
          .lte("published_at", input.toDate)
          .order("published_at", { ascending: false });

        if (input.categories.length > 0) {
          query = query.overlaps("categories", input.categories);
        }

        if (input.limit !== undefined) {
          query = query.limit(input.limit);
        }

        const rows = await many<ArxivPaperRow>(query, "search recent arxiv papers");
        return rows.map(arxivPaperFromRow);
      },

      async getByIds(arxivIds) {
        if (arxivIds.length === 0) {
          return [];
        }

        const rows = await many<ArxivPaperRow>(
          client
            .from("arxiv_papers")
            .select("*")
            .in("arxiv_id", arxivIds),
          "get arxiv papers by ids"
        );

        const byId = new Map(rows.map((row) => [row.arxiv_id, row]));
        return arxivIds
          .map((arxivId) => byId.get(arxivId))
          .filter((row): row is ArxivPaperRow => Boolean(row))
          .map(arxivPaperFromRow);
      }
    },

    runs: {
      async create(input) {
        const row = await insertSingle<AssistantRunRow>(client, "assistant_runs", {
          id: input.id ?? createId(),
          assistant_id: input.assistantId,
          profile_id: input.profileId ?? null,
          status: input.status ?? "queued",
          trigger_type: input.triggerType,
          requested_by_user_id: input.requestedByUserId ?? null,
          workflow_version: input.workflowVersion ?? DEFAULT_WORKFLOW_VERSION
        });

        return assistantRunFromRow(row);
      },

      async getById(id) {
        const row = await maybeSingle<AssistantRunRow>(
          client
            .from("assistant_runs")
            .select("*")
            .eq("id", id)
            .maybeSingle(),
          "get assistant run"
        );

        return row ? assistantRunFromRow(row) : null;
      },

      async listByAssistant(assistantId) {
        const rows = await many<AssistantRunRow>(
          client
            .from("assistant_runs")
            .select("*")
            .eq("assistant_id", assistantId)
            .order("created_at", { ascending: false }),
          "list assistant runs"
        );

        return rows.map(assistantRunFromRow);
      },

      async updateStatus(input) {
        const patch: Record<string, unknown> = {
          status: input.status,
          updated_at: nowIso()
        };

        if (input.startedAt !== undefined) patch.started_at = input.startedAt;
        if (input.finishedAt !== undefined) patch.finished_at = input.finishedAt;
        if (input.errorCode !== undefined) patch.error_code = input.errorCode;
        if (input.errorMessage !== undefined) patch.error_message = input.errorMessage;

        const row = await single<AssistantRunRow>(
          client
            .from("assistant_runs")
            .update(patch)
            .eq("id", input.runId)
            .select("*")
            .single(),
          "update run status"
        );

        return assistantRunFromRow(row);
      }
    },

    runEvents: {
      async append(input) {
        const row = await insertSingle<RunEventRow>(client, "run_events", {
          id: input.id ?? createId(),
          run_id: input.runId,
          step: input.step,
          level: input.level ?? "info",
          message: input.message,
          details: input.details ?? {}
        });

        return runEventFromRow(row);
      },

      async listByRun(runId) {
        const rows = await many<RunEventRow>(
          client
            .from("run_events")
            .select("*")
            .eq("run_id", runId)
            .order("created_at", { ascending: true }),
          "list run events"
        );

        return rows.map(runEventFromRow);
      }
    },

    candidates: {
      async insertMany(runId, candidates) {
        if (candidates.length === 0) {
          return [];
        }

        const rows = await many<RunCandidateRow>(
          client
            .from("run_candidates")
            .insert(
              candidates.map((candidate) => ({
                id: candidate.id ?? createId(),
                run_id: runId,
                arxiv_id: candidate.arxivId,
                candidate_rank: candidate.candidateRank,
                cheap_score: candidate.cheapScore,
                candidate_reason: candidate.candidateReason,
                source: candidate.source ?? {}
              }))
            )
            .select("*"),
          "insert run candidates"
        );

        return rows.map(runCandidateFromRow);
      },

      async listByRun(runId) {
        const rows = await many<RunCandidateRow>(
          client
            .from("run_candidates")
            .select("*")
            .eq("run_id", runId)
            .order("candidate_rank", { ascending: true }),
          "list run candidates"
        );

        return rows.map(runCandidateFromRow);
      }
    },

    scores: {
      async insertMany(runId, scores) {
        if (scores.length === 0) {
          return [];
        }

        const rows = await many<RunScoreRow>(
          client
            .from("run_scores")
            .insert(
              scores.map((score) => ({
                id: score.id ?? createId(),
                run_id: runId,
                arxiv_id: score.arxivId,
                prompt_version: score.promptVersion,
                topic_relevance: score.topicRelevance,
                technical_quality: score.technicalQuality,
                practical_value: score.practicalValue,
                novelty: score.novelty,
                final_score: score.finalScore,
                should_include: score.shouldInclude,
                reason: score.reason,
                raw_model_output: score.rawModelOutput,
                model: score.model ?? null
              }))
            )
            .select("*"),
          "insert run scores"
        );

        return rows.map(runScoreFromRow);
      },

      async listByRun(runId) {
        const rows = await many<RunScoreRow>(
          client
            .from("run_scores")
            .select("*")
            .eq("run_id", runId)
            .order("final_score", { ascending: false }),
          "list run scores"
        );

        return rows.map(runScoreFromRow);
      }
    },

    digests: {
      async create(input) {
        const row = await insertSingle<DigestRow>(client, "digests", {
          id: input.id ?? createId(),
          run_id: input.runId,
          assistant_id: input.assistantId,
          markdown: input.markdown,
          html: input.html,
          selected_papers: input.selectedPapers ?? [],
          candidate_count: input.candidateCount,
          quality_check: input.qualityCheck ?? null,
          digest_prompt_version: input.digestPromptVersion ?? null,
          quality_prompt_version: input.qualityPromptVersion ?? null,
          raw_digest_output: input.rawDigestOutput ?? null,
          raw_quality_output: input.rawQualityOutput ?? null,
          email_status: input.emailStatus ?? "not_sent",
          email_provider_message_id: input.emailProviderMessageId ?? null
        });

        return digestFromRow(row);
      },

      async getById(id) {
        const row = await maybeSingle<DigestRow>(
          client
            .from("digests")
            .select("*")
            .eq("id", id)
            .maybeSingle(),
          "get digest by id"
        );

        return row ? digestFromRow(row) : null;
      },

      async getByRunId(runId) {
        const row = await maybeSingle<DigestRow>(
          client
            .from("digests")
            .select("*")
            .eq("run_id", runId)
            .maybeSingle(),
          "get digest by run"
        );

        return row ? digestFromRow(row) : null;
      },

      async listByAssistant(assistantId) {
        const rows = await many<DigestRow>(
          client
            .from("digests")
            .select("*")
            .eq("assistant_id", assistantId)
            .order("created_at", { ascending: false }),
          "list assistant digests"
        );

        return rows.map(digestFromRow);
      },

      async updateEmailStatus(input) {
        const row = await single<DigestRow>(
          client
            .from("digests")
            .update({
              email_status: input.emailStatus,
              email_provider_message_id: input.emailProviderMessageId ?? null,
              updated_at: nowIso()
            })
            .eq("id", input.digestId)
            .select("*")
            .single(),
          "update digest email status"
        );

        return digestFromRow(row);
      }
    }
  };
}

type QueryResult<T> = PromiseLike<{
  data: T | null;
  error: unknown;
}>;

async function insertSingle<T>(
  client: ResearchSupabaseClient,
  table: string,
  row: Record<string, unknown>
): Promise<T> {
  return single<T>(
    client
      .from(table)
      .insert(row)
      .select("*")
      .single(),
    `insert into ${table}`
  );
}

async function single<T>(query: QueryResult<T>, operation: string): Promise<T> {
  const { data, error } = await query;

  if (error) {
    throw new DatabaseError(`Database operation failed: ${operation}`, error);
  }

  return assertFound(data as T | null, `Database operation returned no row: ${operation}`);
}

async function maybeSingle<T>(
  query: QueryResult<T>,
  operation: string
): Promise<T | null> {
  const { data, error } = await query;

  if (error) {
    throw new DatabaseError(`Database operation failed: ${operation}`, error);
  }

  return (data as T | null) ?? null;
}

async function many<T>(query: QueryResult<T[]>, operation: string): Promise<T[]> {
  const { data, error } = await query;

  if (error) {
    throw new DatabaseError(`Database operation failed: ${operation}`, error);
  }

  return (data as T[] | null) ?? [];
}

function nowIso(): string {
  return new Date().toISOString();
}

async function getLatestProfileRow(
  client: ResearchSupabaseClient,
  assistantId: string
): Promise<AssistantProfileRow | null> {
  return maybeSingle<AssistantProfileRow>(
    client
      .from("assistant_profiles")
      .select("*")
      .eq("assistant_id", assistantId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "get latest assistant profile"
  );
}
