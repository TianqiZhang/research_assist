# 09 Frontend

## Goal

Build a utilitarian MVP frontend for creating assistants, triggering runs, monitoring status, and viewing digest history.

## Dependencies

- `01_project_foundation`
- Stable API contracts from `04_assistant_api_profile_compiler`
- Stable run/digest APIs from `08_workflow_email`

Can start earlier with mocked API responses.

## Owned Areas

Suggested files and directories:

- `src/frontend/`
- `src/http/frontendRoutes.ts`
- `src/http/staticRoutes.ts`
- `test/frontend/`

## Scope

Implement screens:

- Assistant list.
- Create/edit assistant.
- Assistant detail.
- Manual run status.
- Digest history.
- Digest detail.
- Basic run debug timeline.

Do not implement:

- Marketing landing page.
- Complex analytics dashboard.
- Billing/team management.
- Full admin console.

## UX Principles

- First screen should show the actual assistant list or setup flow, not marketing content.
- Keep layout dense, readable, and task-focused.
- Prioritize digest quality and run traceability.
- Avoid decorative UI that hides operational state.

## Required Views

### Assistant List

Shows:

- assistant name
- active status
- schedule
- latest run status
- latest digest date
- manual run action

### Assistant Editor

Fields:

- name
- description
- arXiv categories
- schedule cron
- timezone
- paper count
- active toggle

### Assistant Detail

Shows:

- assistant config summary
- latest compiled profile summary
- latest digest
- recent runs
- manual run button

### Run Status

Shows:

- run status
- started/finished timestamps
- step timeline from `run_events`
- error message if failed
- link to digest if succeeded

### Digest Detail

Shows:

- subject
- rendered digest
- selected paper links
- email delivery status
- quality check summary

## API Usage

Use these routes:

- `GET /assistants`
- `POST /assistants`
- `GET /assistants/:id`
- `PATCH /assistants/:id`
- `POST /assistants/:id/runs`
- `GET /runs/:id`
- `GET /assistants/:id/runs`
- `GET /digests/:id`
- `GET /assistants/:id/digests`

## Tests

Add tests for:

- Assistant list renders empty and non-empty states.
- Assistant form validation.
- Manual run button calls API and navigates to run status.
- Run status renders failed and succeeded states.
- Digest detail renders saved Markdown/HTML safely.

## Acceptance Criteria

- User can create an assistant from the UI.
- User can trigger a manual run.
- User can see run progress and failure state.
- User can view digest history and digest details.
- UI works with mocked APIs before real integrations are complete.

## Handoff Notes

Record:

- Frontend rendering approach selected.
- Any route naming changes.
- Any missing backend fields needed by UI.

