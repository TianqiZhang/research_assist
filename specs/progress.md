# Progress Tracker

This file is the shared task board for AI coding agents. Update it after each meaningful change.

Status values:

- `todo`
- `in_progress`
- `blocked`
- `done`

## Current Overall Status

Project state: `planning`

No implementation scaffold exists yet. The first implementation task is `01 Project Foundation`.

## Component Status

| Component | Status | Owner | Notes |
| --- | --- | --- | --- |
| 01 Project Foundation | todo | unassigned | Create app scaffold, scripts, config, local test setup |
| 02 Database Repositories | todo | unassigned | Add migrations and repository layer |
| 03 arXiv Cache | todo | unassigned | Fetch and upsert arXiv metadata |
| 04 Assistant API + Profile Compiler | todo | unassigned | Assistant CRUD and profile versioning |
| 05 Candidate Generation | todo | unassigned | Cheap deterministic candidate selector |
| 06 LLM Scoring | todo | unassigned | Batch scorer with validation and retries |
| 07 Ranking + Digest + Quality | todo | unassigned | Selection, digest generation, quality check |
| 08 Workflow + Email | todo | unassigned | Durable run orchestration and email delivery |
| 09 Frontend | todo | unassigned | Assistant UI, runs, digest history |
| 10 Observability + Security + Tests | todo | unassigned | Auth, run timeline, test hardening |

## Milestone Checklist

### M1: Local Vertical Slice With Mocks

- [ ] Scaffold TypeScript Worker app.
- [ ] Add database migrations.
- [ ] Add repository layer.
- [ ] Insert fixture user, assistant, and arXiv papers.
- [ ] Run workflow with mocked LLM and email providers.
- [ ] Save digest.
- [ ] Render digest through frontend or API.

### M2: Real Data Integrations

- [ ] Implement real arXiv cache refresh.
- [ ] Implement real profile compiler LLM call.
- [ ] Implement real candidate scoring LLM call.
- [ ] Implement real digest generation.
- [ ] Implement real quality check.
- [ ] Implement real email delivery.

### M3: Scheduled MVP

- [ ] Add queue job for assistant runs.
- [ ] Add cron handler for due assistants.
- [ ] Add durable workflow step logging.
- [ ] Add manual run status UI.
- [ ] Add digest history UI.
- [ ] Add basic failure/debug view.

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

No interface changes yet.

## Test Notes

No tests run yet.

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

