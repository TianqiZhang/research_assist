# AGENTS.md

This repository contains an implemented local mocked MVP for the Research Assistant. Coding agents should treat the committed implementation as the current working baseline and `specs/` as the product/contract record that must stay in sync with meaningful behavior changes.

## Read First

Before making changes, read these files in order:

1. `README.md`
2. `specs/README.md`
3. `specs/progress.md`
4. The relevant component spec in `specs/components/`
5. The related implementation and tests

## Current Source of Truth

- Current implementation baseline: `src/`, `test/`, `migrations/`, and `README.md`
- Product and architecture intent: `specs/README.md`
- Task tracker, decisions, remaining work, and handoff notes: `specs/progress.md`
- Component-level contracts and historical build plan: `specs/components/*.md`

If code and specs disagree, inspect the implementation and tests first, then update the affected specs/progress notes when the implemented behavior is intentional.

## Current Project State

- Components 01-10 are implemented for the local mocked MVP.
- Local development uses mock LLM/email providers and an in-memory repository when Supabase credentials are absent.
- Manual and scheduled runs execute synchronously in-process for now.
- Real provider adapters, production auth, queue-backed workflow execution, and deployment hardening remain future work.

## Agent Workflow

Before editing:

- Check `specs/progress.md` for current status, ownership, decisions, and blockers.
- Inspect the relevant code and tests before changing behavior.
- Add a short active-work note in `specs/progress.md` when starting substantial implementation work.

While editing:

- Keep changes scoped to the requested feature, bug, or documentation task.
- Prefer existing implementation conventions over the original proposed layout when they differ.
- Do not change another component's contract silently.
- If an interface changes, update the affected component specs and record it in `specs/progress.md`.
- Store prompt versions and raw LLM outputs wherever the specs require it.
- Keep LLM workflows bounded, replayable, and observable.
- Add or update functional/behavioral tests for code changes.

After editing:

- Run `npm test` and `npm run typecheck` for code changes, or explain why they were not run.
- For docs-only changes, run a lightweight check such as `git diff --check`.
- Update `specs/progress.md` when work changes project status, contracts, known issues, or next-step guidance.

## Product Constraints

- The system is a bounded workflow, not an open-ended autonomous agent.
- MVP paper evaluation is based on arXiv title and abstract, not full PDF content.
- Candidate generation should be cheap and deterministic.
- LLMs are used only for profile compilation, candidate scoring, digest generation, and quality checking.
- Workflow retries must be bounded.
- Failed runs should preserve useful intermediate state.
- Do not claim the system read full PDFs until full-text ingestion exists.

## Component Specs

The original MVP build sequence is complete. Keep these component specs useful as contract references and update them when intentional behavior changes:

- `specs/components/01_project_foundation.md`
- `specs/components/02_database_repositories.md`
- `specs/components/03_arxiv_cache.md`
- `specs/components/04_assistant_api_profile_compiler.md`
- `specs/components/05_candidate_generation.md`
- `specs/components/06_llm_scoring.md`
- `specs/components/07_ranking_digest_quality.md`
- `specs/components/08_workflow_email.md`
- `specs/components/09_frontend.md`
- `specs/components/10_observability_security_tests.md`

## Common Commands

```sh
npm test
npm run typecheck
npm run dev
```
