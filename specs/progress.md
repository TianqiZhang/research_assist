# Progress Tracker

This file is the shared task board for AI coding agents. Update it after each meaningful change.

Status values:

- `todo`
- `in_progress`
- `blocked`
- `done`

## Current Overall Status

Project state: `implementation`

Components 01-10 are implemented for the local mocked MVP. Remaining work is real provider integration, production auth/queue hardening, and any deployment-specific setup.

## Component Status

| Component | Status | Owner | Notes |
| --- | --- | --- | --- |
| 01 Project Foundation | done | Codex | TypeScript Worker scaffold, Hono router, health endpoint, env validation, provider contracts, and tests added |
| 02 Database Repositories | done | Codex | Core SQL migration, typed repositories, Supabase implementation, in-memory test implementation, fixtures, and tests added |
| 03 arXiv Cache | done | Codex | arXiv API client, Atom parser, cache refresh service, internal refresh route, fixtures, and mocked tests added |
| 04 Assistant API + Profile Compiler | done | Codex | Assistant CRUD routes, single-user dev stub, mock profile compiler, profile validation/versioning, and tests added |
| 05 Candidate Generation | done | Codex | Deterministic text/category/recency scoring service, candidate cap handling, persistence, and tests added |
| 06 LLM Scoring | done | Codex | Batch scoring prompt/service, validation, retries/repair, raw output persistence, failed-batch events, and tests added |
| 07 Ranking + Digest + Quality | done | Codex | Ranking/diversification, digest generation, Markdown HTML conversion, quality check, persistence, and tests added |
| 08 Workflow + Email | done | Codex | In-process workflow runner, run routes, cron route, mock email adapter, email status updates, and tests added |
| 09 Frontend | done | Codex | Server-rendered `/app` UI for assistants, manual runs, run timelines, digest history/detail, and tests added |
| 10 Observability + Security + Tests | done | Codex | Auth/internal-secret helpers, run timeline formatting, error sanitizer, smoke/security tests, and docs added |

## Milestone Checklist

### M1: Local Vertical Slice With Mocks

- [x] Scaffold TypeScript Worker app.
- [x] Add database migrations.
- [x] Add repository layer.
- [x] Insert fixture user, assistant, and arXiv papers.
- [x] Run workflow with mocked LLM and email providers.
- [x] Save digest.
- [x] Render digest through frontend or API.

### M2: Real Data Integrations

- [x] Implement real arXiv cache refresh.
- [ ] Implement real profile compiler LLM call.
- [ ] Implement real candidate scoring LLM call.
- [ ] Implement real digest generation.
- [ ] Implement real quality check.
- [ ] Implement real email delivery.

### M3: Scheduled MVP

- [ ] Add queue job for assistant runs.
- [x] Add cron handler for due assistants.
- [x] Add durable workflow step logging.
- [x] Add manual run status UI.
- [x] Add digest history UI.
- [x] Add basic failure/debug view.

## Active Work

No active implementation work recorded.

## Blockers

No blockers recorded.

## Decisions

- 2026-04-25: The system is a bounded workflow, not an open-ended autonomous agent.
- 2026-04-25: MVP paper evaluation is based on arXiv title and abstract, not full PDF content.
- 2026-04-25: Store raw LLM outputs and prompt versions for all LLM steps.
- 2026-04-25: Single-user dev stub for MVP auth (hardcoded user_id, no login).
- 2026-04-25: In-process workflow runner for M1; swap to Cloudflare Workflows later.
- 2026-04-25: Default LLM provider is OpenAI (gpt-4o / gpt-4o-mini).
- 2026-04-25: Default arXiv categories: cs.AI, cs.CL, cs.LG.
- 2026-04-25: No pgvector / no embeddings for MVP.
- 2026-04-25: Empty digests are saved but not emailed.
- 2026-04-25: Manual runs use fixed 7-day lookback, no custom date window.
- 2026-04-25: Frontend is server-rendered HTML with Hono JSX.

## Interface Change Log

- 2026-04-25: Added `profiles.getByVersion(assistantId, version)` to the repository contract so candidate generation can use the run's explicit profile version instead of assuming the latest profile.
- 2026-04-25: Added `papers.getByIds(arxivIds)` to the repository contract so LLM scoring can load compact metadata for persisted candidate IDs.
- 2026-04-25: Added `digests.updateEmailStatus(input)` to the repository contract so workflow/email delivery can mark sent, skipped, or failed without rewriting digest content.
- 2026-04-25: Added `digests.getById(id)` to the repository contract for digest detail API/frontend routes.

## Test Notes

- 2026-04-25: Component 01 checks passed: `npm install`, `npm test` (8 tests), `npm run typecheck`, and local Worker smoke test with `npm run dev -- --ip 127.0.0.1 --port 8787` plus `curl http://127.0.0.1:8787/health` returning HTTP 200 and `{"ok":true,"service":"research-assistant"}`.
- 2026-04-25: Component 02 checks passed: `npm test` (15 tests, including PGlite migration application and in-memory repository behavior coverage) and `npm run typecheck`.
- 2026-04-25: Component 03 checks passed: `npm test` (22 tests, including arXiv parser normalization, dedupe/upsert refresh behavior, internal route auth, migration application, and repository behavior), `npm run typecheck`, and local Worker smoke test with `/health` returning HTTP 200 plus `POST /internal/arxiv/refresh` without a secret returning HTTP 401.
- 2026-04-25: Component 04 checks passed: `npm test` (32 tests, including assistant CRUD/profile versioning, mock local dependency fallback, profile compiler retry/validation, prior arXiv/db/foundation coverage) and `npm run typecheck`. Local Worker smoke test: `/health` returned HTTP 200 and `POST /assistants` returned HTTP 201 with profile version 1 using local mock repositories/providers.
- 2026-04-25: Component 05 checks passed: `npm test` (38 tests, including deterministic candidate scoring, include/exclude/recency behavior, candidate caps, persistence to `run_candidates`, and prior coverage) and `npm run typecheck`.
- 2026-04-25: Component 06 checks passed: `npm test` (44 tests, including candidate scoring validation, batching, invalid JSON retry, missing-ID repair, failed-batch run events, and prior coverage) and `npm run typecheck`.
- 2026-04-25: Component 07 checks passed: `npm test` (52 tests, including ranking threshold behavior, duplicate title removal, topic bucket diversity, digest Markdown/HTML persistence, quality regeneration, full-text-claim rejection, and prior coverage) and `npm run typecheck`.
- 2026-04-25: Component 08 checks passed: `npm test` (58 tests, including in-process workflow step order, failure handling, email failure behavior, run routes, cron auth/due selection, and prior coverage) and `npm run typecheck`. Local Worker smoke test created an assistant, triggered a manual run, and fetched run status showing `succeeded`, an empty saved digest, skipped email, and all workflow step events.
- 2026-04-25: Component 09 checks passed: `npm test` (64 tests, including frontend empty/non-empty assistant list, form validation/edit, manual run redirect, failed run timeline, sanitized digest detail, and prior coverage) and `npm run typecheck`. Local Worker smoke test confirmed `/app` returns HTML and `/app/assistants` form POST redirects to assistant detail.
- 2026-04-25: Component 10 checks passed: `npm test` (73 tests, including auth/internal-secret helpers, public error sanitization, run timeline formatting, ownership denial, mocked manual-run smoke, and prior coverage) and `npm run typecheck`.

## Handoffs

```text
Date: 2026-04-25
Agent: Codex
Component: 01 Project Foundation
Files changed: package.json, package-lock.json, tsconfig.json, wrangler.toml, vitest.config.ts, .env.example, .gitignore, README.md, src/index.ts, src/env.ts, src/domain/health.ts, src/domain/providers.ts, src/http/errors.ts, src/http/router.ts, test/env.test.ts, test/http/errors.test.ts, test/http/health.test.ts, specs/progress.md
What changed: Created the TypeScript Cloudflare Worker scaffold with Hono, `/health`, stable JSON error responses, environment validation with mock-provider relaxation, placeholder database/LLM/email contracts, and focused Vitest coverage.
Tests run: npm install; npm test; npm run typecheck; npm run dev -- --ip 127.0.0.1 --port 8787; curl -sS -i http://127.0.0.1:8787/health
Known issues: None.
Next recommended step: Start Component 02 Database Repositories.
```

```text
Date: 2026-04-25
Agent: Codex
Component: 02 Database Repositories
Files changed: migrations/0001_core_schema.sql, src/domain/types.ts, src/db/errors.ts, src/db/ids.ts, src/db/index.ts, src/db/repositories.ts, src/db/schema.ts, src/db/supabase.ts, src/db/supabaseRepositories.ts, src/db/memory.ts, test/fixtures/domain.ts, test/db/migration.test.ts, test/db/repositories.test.ts, package.json, package-lock.json, README.md, specs/progress.md
What changed: Added the core Postgres schema, stable domain/repository contracts, Supabase client and repository implementation, in-memory repository implementation for default tests, and fixtures for user/assistant/profile/papers/run. Documented migration usage in README.
Tests run: npm test; npm run typecheck
Known issues: No real Supabase integration test was run. pgvector is intentionally omitted for MVP. UUIDs are generated by the repository layer instead of database defaults so migrations apply cleanly in local PGlite tests. `arxiv_papers.updated_at` stores arXiv metadata update time; `arxiv_papers.cached_at` stores cache write time.
Next recommended step: Start Component 03 arXiv Cache.
```

```text
Date: 2026-04-25
Agent: Codex
Component: 03 arXiv Cache
Files changed: src/arxiv/client.ts, src/arxiv/index.ts, src/arxiv/parser.ts, src/arxiv/refresh.ts, src/arxiv/types.ts, src/http/internalArxivRoutes.ts, src/http/router.ts, src/http/types.ts, test/fixtures/arxiv/feed.xml, test/arxiv/parser.test.ts, test/arxiv/refresh.test.ts, test/http/internalArxivRoutes.test.ts, package.json, package-lock.json, specs/progress.md
What changed: Added a retrying arXiv API client, Atom XML parser using fast-xml-parser, whitespace/date/category normalization, dedupe-before-upsert cache refresh service, and `POST /internal/arxiv/refresh` with `x-internal-api-secret` or Bearer secret auth.
Tests run: npm test; npm run typecheck; npm run dev -- --ip 127.0.0.1 --port 8787; curl -sS -i http://127.0.0.1:8787/health; curl -sS -i -X POST http://127.0.0.1:8787/internal/arxiv/refresh -H 'content-type: application/json' --data '{"categories":["cs.AI"],"from_date":"2026-04-01","to_date":"2026-04-25"}'
Known issues: Real arXiv-to-Supabase integration was not run because no Supabase credentials are configured. Default category/date windows are caller-provided; the MVP defaults remain cs.AI/cs.CL/cs.LG and 7-day manual lookback from the shared decisions.
Next recommended step: Start Component 04 Assistant API + Profile Compiler.
```

```text
Date: 2026-04-25
Agent: Codex
Component: 04 Assistant API + Profile Compiler
Files changed: src/domain/assistants.ts, src/http/assistantRoutes.ts, src/http/dependencies.ts, src/http/router.ts, src/http/types.ts, src/llm/index.ts, src/llm/mockProvider.ts, src/llm/profileCompiler.ts, src/llm/prompts/profileCompiler.ts, src/llm/provider.ts, test/assistants/assistantRoutes.test.ts, test/llm/profileCompiler.test.ts, specs/progress.md
What changed: Added assistant list/get/create/update/delete routes, local single-user stub (`00000000-0000-4000-8000-000000000001`), process-local in-memory repository fallback for `USE_MOCK_PROVIDERS=true`, mock LLM provider, profile compiler prompt versioning, profile validation, invalid JSON retry, rubric default normalization, and description-change profile versioning.
Tests run: npm test; npm run typecheck; npm run dev -- --ip 127.0.0.1 --port 8787; curl -sS -i http://127.0.0.1:8787/health; curl -sS -i -X POST http://127.0.0.1:8787/assistants -H 'content-type: application/json' --data '{"name":"Local Agent Papers","description":"Find practical papers about AI agents and RAG.","arxiv_categories":["cs.AI","cs.CL"],"paper_count":5}'
Known issues: Real OpenAI profile compilation is not implemented yet; mocked profile compilation is used for default tests/local dev. API responses use snake_case JSON. Invalid rubric values are normalized to defaults and surfaced as compiler warnings; no run event is written because assistant profile compilation is not run-scoped in this component.
Next recommended step: Start Component 05 Candidate Generation.
```

```text
Date: 2026-04-25
Agent: Codex
Component: 05 Candidate Generation
Files changed: src/domain/candidateGeneration.ts, src/domain/textMatching.ts, src/db/repositories.ts, src/db/supabaseRepositories.ts, src/db/memory.ts, test/domain/candidateGeneration.test.ts, test/fixtures/papers.ts, specs/components/02_database_repositories.md, specs/progress.md
What changed: Added deterministic candidate generation using category, keyword, and recency scores; deterministic reason generation; candidate limit clamping; persistence to `run_candidates`; and explicit profile-version lookup support.
Tests run: npm test; npm run typecheck
Known issues: Embeddings are omitted for MVP per project decision. Cheap scoring weights are 0.45 category, 0.35 keyword, 0.20 recency. Keyword matching is normalized substring matching over title plus abstract.
Next recommended step: Start Component 06 LLM Scoring.
```

```text
Date: 2026-04-25
Agent: Codex
Component: 06 LLM Scoring
Files changed: src/domain/scoring.ts, src/llm/scoring.ts, src/llm/prompts/candidateScoring.ts, src/llm/index.ts, src/db/repositories.ts, src/db/supabaseRepositories.ts, src/db/memory.ts, test/llm/scoring.test.ts, specs/components/02_database_repositories.md, specs/progress.md
What changed: Added `candidate-scoring-v1`, compact candidate scoring prompts, batch scoring with default batch size 20, invalid provider/malformed output retries up to 2, one missing-ID repair call, validation for score dimensions/final score/reasons, raw model output persistence, and append-only run events when a batch fails.
Tests run: npm test; npm run typecheck
Known issues: Real OpenAI scoring provider is not implemented yet; tests use mocked JSON provider responses. Failed batches are skipped after retries while successful batches remain persisted.
Next recommended step: Start Component 07 Ranking + Digest + Quality.
```

```text
Date: 2026-04-25
Agent: Codex
Component: 07 Ranking + Digest + Quality
Files changed: src/domain/ranking.ts, src/domain/digest.ts, src/llm/digestGeneration.ts, src/llm/qualityCheck.ts, src/llm/prompts/digestGeneration.ts, src/llm/prompts/qualityCheck.ts, src/llm/index.ts, test/domain/ranking.test.ts, test/domain/digest.test.ts, package.json, package-lock.json, specs/progress.md
What changed: Added deterministic final paper selection, score thresholding, near-duplicate title removal, topic-bucket diversity, structured digest generation, marked-based Markdown-to-HTML conversion, quality-check validation, one-time regeneration on quality failure, full-text claim guard, and digest persistence with raw digest/quality outputs.
Tests run: npm test; npm run typecheck
Known issues: Real digest/quality LLM providers are not implemented yet; tests use mocked JSON responses. Title similarity uses normalized token Jaccard >= 0.9 plus exact normalized match. Raw digest output is stored in `digests.raw_digest_output`; raw quality output is stored in `digests.raw_quality_output`.
Next recommended step: Start Component 08 Workflow + Email.
```

```text
Date: 2026-04-25
Agent: Codex
Component: 08 Workflow + Email
Files changed: src/workflow/runWorkflow.ts, src/workflow/schedule.ts, src/workflow/index.ts, src/email/provider.ts, src/email/index.ts, src/http/runRoutes.ts, src/http/internalCronRoutes.ts, src/http/router.ts, src/http/types.ts, src/http/dependencies.ts, src/domain/types.ts, src/db/repositories.ts, src/db/supabaseRepositories.ts, src/db/memory.ts, test/workflow/runWorkflow.test.ts, test/http/runRoutes.test.ts, test/http/internalCronRoutes.test.ts, test/fixtures/workflow.ts, specs/components/02_database_repositories.md, specs/progress.md
What changed: Added `ResearchAssistantRunWorkflow` as an in-process runner, manual run/status/history routes, due-assistant cron route, step-level run events, mock email provider, digest email status updates, empty-digest email skipping, and synchronous local run execution for the MVP.
Tests run: npm test; npm run typecheck; npm run dev -- --ip 127.0.0.1 --port 8787; local Node fetch smoke for POST /assistants, POST /assistants/:id/runs, and GET /runs/:id
Known issues: Cloudflare Queues/Workflows are not implemented yet; the queue message shape is `{ assistant_id, trigger_type, requested_by_user_id }` by workflow contract, but local routes call the runner synchronously. Cron matching is a simple UTC five-field matcher and does not yet honor assistant timezones. Real email delivery is not implemented; `MockEmailProvider` is used for tests/local mocked development.
Next recommended step: Start Component 09 Frontend.
```

```text
Date: 2026-04-25
Agent: Codex
Component: 09 Frontend
Files changed: src/frontend/sanitize.ts, src/http/frontendRoutes.tsx, src/http/digestRoutes.ts, src/http/router.ts, src/db/repositories.ts, src/db/supabaseRepositories.ts, src/db/memory.ts, test/frontend/frontendRoutes.test.ts, package.json, package-lock.json, specs/components/02_database_repositories.md, specs/progress.md
What changed: Added server-rendered Hono JSX frontend under `/app`, assistant create/edit forms, assistant detail, manual run action, run status timeline, digest history/detail, digest API routes, and sanitize-html allowlisted rendering for saved digest HTML.
Tests run: npm test; npm run typecheck; npm run dev -- --ip 127.0.0.1 --port 8787; curl -sS -i http://127.0.0.1:8787/app; curl -sS -i -X POST http://127.0.0.1:8787/app/assistants -H 'content-type: application/x-www-form-urlencoded' --data 'name=UI%20Smoke%20Agent&description=Find%20practical%20AI%20agent%20papers&arxiv_categories=cs.AI%2C%20cs.CL&timezone=UTC&paper_count=5&is_active=true'
Known issues: UI route scheme is `/app/*` to avoid conflicts with JSON API routes. Digest HTML is sanitized before rendering. There are no missing backend fields for the implemented MVP screens, but editing uses POST form handlers rather than PATCH from the browser.
Next recommended step: Start Component 10 Observability + Security + Tests.
```

```text
Date: 2026-04-25
Agent: Codex
Component: 10 Observability + Security + Tests
Files changed: src/http/auth.ts, src/http/internalArxivRoutes.ts, src/http/internalCronRoutes.ts, src/observability/errors.ts, src/observability/runTimeline.ts, src/observability/index.ts, test/security/auth.test.ts, test/security/ownership.test.ts, test/observability/runTimeline.test.ts, test/integration/manualRunSmoke.test.ts, README.md, specs/progress.md
What changed: Added single-user ownership helpers, shared internal secret validation, public error sanitizer, run timeline formatter, ownership/internal-route security coverage, mocked end-to-end manual-run smoke coverage, and README notes for auth/internal routes/local mocked repositories.
Tests run: npm test; npm run typecheck
Known issues: Production authentication is still a single-user stub, not real auth. Public routes are owner-scoped to the stub user. Raw provider details can still be stored in internal run-event details for debugging, but public helpers sanitize direct error responses. Queue/Cloudflare Workflow integration and real provider adapters remain future work.
Next recommended step: Decide whether to integrate real OpenAI/email/Supabase credentials or replace the local runner with Cloudflare Queues/Workflows.
```

```text
Date: 2026-04-25
Agent: Codex
Component: Review + cleanup
Files changed: src/utils.ts, src/arxiv/parser.ts, src/arxiv/refresh.ts, src/domain/digest.ts, src/domain/scoring.ts, src/http/dependencies.ts, src/http/runRoutes.ts, src/llm/digestGeneration.ts, src/llm/profileCompiler.ts, src/llm/qualityCheck.ts, src/llm/scoring.ts, src/workflow/runWorkflow.ts, test/http/runRoutes.test.ts, specs/components/08_workflow_email.md, specs/progress.md
What changed: Reviewed simplification pass, kept shared `isRecord` and `retryAsync` helpers, kept single-call empty digest markdown generation, kept typed workflow trigger/event levels, kept truthful synchronous manual-run status response, documented the local API status behavior, and verified parallel arXiv category refresh remains acceptable for the MVP default categories.
Tests run: npm test; npm run typecheck; git diff --check; git diff --cached --check
Known issues: Manual runs still execute synchronously until queue-backed execution is added.
Next recommended step: Commit the MVP baseline, then choose the next production hardening slice.
```

```text
Date: 2026-04-26
Agent: Codex
Component: Real LLM provider integration
Files changed: src/llm/azureOpenAiProvider.ts, src/llm/index.ts, src/env.ts, src/http/dependencies.ts, src/arxiv/client.ts, test/llm/azureOpenAiProvider.test.ts, test/http/dependencies.test.ts, test/env.test.ts, .env.example, specs/progress.md
What changed: Added a fetch-based Azure OpenAI chat-completions provider behind the existing `LlmProvider.generateJson()` interface, added Azure OpenAI environment fields, allowed mixed real Azure LLM plus mock email configuration, kept `USE_MOCK_PROVIDERS=true` as the global provider override, fixed Worker-safe default fetch binding for Azure/arXiv clients, and covered request/response/error/dependency-resolution behavior with focused tests.
Tests run: npm test; npm run typecheck; git diff --check
Known issues: Real email delivery is still not implemented. Azure OpenAI uses JSON mode plus existing validators/retries; strict schema outputs can be added later if the deployment/API version supports the required schema behavior.
Next recommended step: Fill Azure OpenAI values in `.dev.vars`, run a live assistant/profile smoke, then test a full run after refreshing the arXiv cache.
```

## Handoff Template

```text
Date:
Agent:
Component:
Files changed:
What changed:
Tests run:
Known issues:
Next recommended step:
```
