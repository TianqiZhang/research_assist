# Agent Spec Pack: Research Assistant

This directory is the working spec pack for AI coding agents. It breaks the product into independently executable component specs while keeping a shared overview and tracker.

## Required Reading Order

Every agent should read these files before making changes:

1. `specs/README.md`
2. `specs/progress.md`
3. The specific component spec assigned to the agent

## Product Summary

Build a configurable AI research assistant that:

- Lets a user define natural-language paper selection criteria.
- Maintains a local cache of arXiv metadata.
- Runs manually or on a schedule.
- Selects candidate papers through cheap deterministic filtering.
- Uses LLMs only for bounded semantic work: profile compilation, candidate scoring, digest generation, and quality checking.
- Stores intermediate state so each run is debuggable and replayable.
- Saves and emails a concise digest.

The system is a bounded workflow, not an open-ended autonomous agent.

## Target Architecture

```text
Frontend
  -> Worker HTTP API
    -> Supabase Postgres
    -> LLM Provider Adapter
    -> Email Provider Adapter
    -> Queue / Workflow / Cron

Cron Trigger
  -> find due assistants
  -> enqueue run job

Queue Worker
  -> start ResearchAssistantRunWorkflow

Workflow
  -> load assistant
  -> compile or load profile
  -> retrieve candidates
  -> score candidates
  -> rank and diversify
  -> generate digest
  -> quality check
  -> save digest
  -> send email
```

## Proposed Code Layout

Agents should follow this layout unless the project scaffold chooses an equivalent local convention.

```text
src/
  index.ts
  env.ts
  http/
  db/
  domain/
  arxiv/
  llm/
  email/
  workflow/
  frontend/
  observability/
test/
  fixtures/
migrations/
specs/
```

## Component Specs

Work should be split across these specs:

- `components/01_project_foundation.md`
- `components/02_database_repositories.md`
- `components/03_arxiv_cache.md`
- `components/04_assistant_api_profile_compiler.md`
- `components/05_candidate_generation.md`
- `components/06_llm_scoring.md`
- `components/07_ranking_digest_quality.md`
- `components/08_workflow_email.md`
- `components/09_frontend.md`
- `components/10_observability_security_tests.md`

## Dependency Graph

```text
01 Project Foundation
  -> 02 Database Repositories
    -> 03 arXiv Cache
    -> 04 Assistant API + Profile Compiler
      -> 05 Candidate Generation
        -> 06 LLM Scoring
          -> 07 Ranking + Digest + Quality
            -> 08 Workflow + Email
              -> 09 Frontend
              -> 10 Observability + Security + Tests
```

Some work can happen in parallel:

- `03_arxiv_cache` can proceed after database tables exist.
- `04_assistant_api_profile_compiler` can proceed after assistant/profile repositories exist.
- `09_frontend` can start with mocked API responses after API contracts are stable.
- `10_observability_security_tests` can start once run events and auth conventions exist.

## Agent Operating Protocol

Before editing:

- Check `progress.md` for task status, decisions, blockers, and active work.
- Add a short active-work note in `progress.md` with your intended scope.

While editing:

- Keep changes scoped to the component spec.
- Do not modify another component's owned files unless required by an explicit interface.
- If an interface must change, update the relevant component specs and record it in `progress.md`.
- Prefer small, testable units over large integrated changes.

After editing:

- Update `progress.md` task status and add a handoff note.
- Record tests run and any failures in `progress.md`.
- Update the component spec only if the intended contract changed.

## Shared Conventions

- Runtime language: TypeScript.
- API responses should be JSON.
- Decision-making LLM calls must request structured JSON and validate outputs.
- Prompt versions must be explicit string constants.
- Persist raw LLM output for replay/debugging.
- Keep workflow retries bounded.
- Do not claim the system read full PDFs until full-text ingestion exists.
- For MVP, title and abstract are the source material for paper evaluation.

## MVP Decisions

Resolved 2026-04-25:

- **Auth model:** Single-user dev stub. Hardcoded `user_id`, no login flow for MVP.
- **Workflow runner for M1:** In-process runner with the same step contract as Cloudflare Workflows. Swap to CF Workflows after the local vertical slice works.
- **Default LLM provider:** OpenAI (gpt-4o or gpt-4o-mini) behind the provider adapter.
- **Default arXiv categories:** `cs.AI`, `cs.CL`, `cs.LG` for new assistants.
- **pgvector:** Not available / skip embeddings for MVP. Use keyword-only cheap scoring.
- **Empty digests:** Save the digest record but do not send email.
- **Manual run date windows:** Fixed lookback (e.g., 7 days). No custom date picker for MVP.
- **Frontend rendering:** Server-rendered HTML with Hono JSX. No separate SPA build pipeline.

## Global Acceptance Criteria

The MVP is ready when:

- A user can create an assistant.
- The system can cache recent arXiv papers.
- A manual run completes end to end with mocked or real providers.
- A scheduled run can be enqueued by cron.
- Selected papers, scores, digest, and run events are persisted.
- A digest can be viewed in the app and sent by email.
- Failed runs expose useful status without losing prior step outputs.
