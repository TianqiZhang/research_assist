# AGENTS.md

This repository is currently in planning/specification mode for a Research Assistant MVP. Coding agents should treat `specs/` as the active source of truth.

## Read First

Before making changes, read these files in order:

1. `specs/README.md`
2. `specs/progress.md`
3. The component spec for your assigned task in `specs/components/`

## Current Source of Truth

- Product and architecture overview: `specs/README.md`
- Task tracker, decisions, and coordination notes: `specs/progress.md`
- Component-level implementation specs: `specs/components/*.md`

## Agent Workflow

Before editing:

- Check `specs/progress.md` for current status, ownership, decisions, and blockers.
- Add a short active-work note in `specs/progress.md` if you are starting a component.

While editing:

- Keep changes scoped to your assigned component.
- Prefer the proposed layout in `specs/README.md` unless the existing implementation establishes a better local convention.
- Do not change another component's contract silently.
- If an interface changes, update the affected component specs and record it in `specs/progress.md`.
- Store prompt versions and raw LLM outputs wherever the specs require it.
- Keep LLM workflows bounded, replayable, and observable.

After editing:

- Update `specs/progress.md` (status, handoff note, tests run, failures).

## Product Constraints

- The system is a bounded workflow, not an open-ended autonomous agent.
- MVP paper evaluation is based on arXiv title and abstract, not full PDF content.
- Candidate generation should be cheap and deterministic.
- LLMs are used only for profile compilation, candidate scoring, digest generation, and quality checking.
- Workflow retries must be bounded.
- Failed runs should preserve useful intermediate state.

## Initial Build Order

1. `specs/components/01_project_foundation.md`
2. `specs/components/02_database_repositories.md`
3. `specs/components/03_arxiv_cache.md`
4. `specs/components/04_assistant_api_profile_compiler.md`
5. `specs/components/05_candidate_generation.md`
6. `specs/components/06_llm_scoring.md`
7. `specs/components/07_ranking_digest_quality.md`
8. `specs/components/08_workflow_email.md`
9. `specs/components/09_frontend.md`
10. `specs/components/10_observability_security_tests.md`

Some later work can proceed in parallel once its dependencies in the component spec are satisfied.

