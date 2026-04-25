# 08 Workflow and Email

## Goal

Implement the end-to-end assistant run orchestration, queue/cron entrypoints, and email delivery integration.

## Dependencies

- `02_database_repositories`
- `03_arxiv_cache`
- `04_assistant_api_profile_compiler`
- `05_candidate_generation`
- `06_llm_scoring`
- `07_ranking_digest_quality`

## Owned Areas

Suggested files and directories:

- `src/workflow/`
- `src/http/runRoutes.ts`
- `src/http/internalCronRoutes.ts`
- `src/email/`
- `test/workflow/`
- `test/email/`

## Scope

Implement:

- Manual run endpoint.
- Run status endpoint.
- Workflow runner.
- Queue job handler.
- Cron handler for due assistants.
- Email provider adapter.
- Email delivery status updates.
- Run event logging at every step.

Do not implement:

- Frontend pages.
- New ranking/scoring behavior.
- New prompt contracts.

## Workflow Contract

Workflow name:

```text
ResearchAssistantRunWorkflow
```

Input:

```json
{
  "assistant_id": "uuid",
  "trigger_type": "manual",
  "requested_by_user_id": "uuid"
}
```

Steps:

1. `load_assistant_config`
2. `compile_or_load_profile`
3. `retrieve_candidates`
4. `score_candidates`
5. `rank_and_diversify`
6. `generate_digest`
7. `quality_check`
8. `save_digest`
9. `send_email`
10. `finish_run`

Each step must append at least one run event.

## API Contracts

### `POST /assistants/:id/runs`

Starts a manual run.

Response:

```json
{
  "run_id": "uuid",
  "status": "queued"
}
```

### `GET /runs/:id`

Returns:

- run status
- run events
- digest summary if complete
- email delivery status if available

### `GET /assistants/:id/runs`

Returns run history for an assistant.

### `POST /internal/cron/due-assistants`

Requires internal auth. Finds due active assistants and enqueues run jobs.

## Retry Policy

| Step | Retry policy | Failure behavior |
| --- | --- | --- |
| Load assistant | no retry | fail run |
| Compile profile | 2 retries | fail run |
| Retrieve candidates | 1 retry | save empty digest if no candidates |
| Score candidates | 2 retries per batch | continue if enough scores remain |
| Rank/diversify | no retry | fail run |
| Generate digest | 2 retries | fail run |
| Quality check | 1 retry | regenerate digest at most once |
| Send email | 3 retries | keep digest saved and mark email failed |

## Email Contract

```ts
type SendDigestEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  digestId: string;
};
```

Email subject:

```text
{assistant_name}: {N} new papers for {date}
```

## Tests

Add tests for:

- Manual run creates queued/running run.
- Workflow calls steps in order with mocks.
- Step failure marks run failed and writes event.
- Email failure keeps digest saved.
- Cron endpoint rejects missing secret.
- Due assistant selection respects schedule fields.

## Acceptance Criteria

- Manual run completes end to end with mocked providers.
- Digest is saved before email is sent.
- Email failure does not fail digest persistence.
- Run status endpoint exposes useful progress.
- Scheduled run can be enqueued from cron.

## Handoff Notes

Record:

- Whether Cloudflare Workflows are implemented directly or behind a local runner abstraction.
- Queue message shape.
- Email provider selected.

