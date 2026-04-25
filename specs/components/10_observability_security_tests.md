# 10 Observability, Security, and Test Hardening

## Goal

Harden the MVP with useful run observability, access control, provider error sanitization, and a test suite that protects the workflow contracts.

## Dependencies

- `01_project_foundation`
- `02_database_repositories`
- `08_workflow_email`
- `09_frontend`

Can start partially after foundation and database work are complete.

## Owned Areas

Suggested files and directories:

- `src/observability/`
- `src/http/auth.ts`
- `src/http/errors.ts`
- `test/integration/`
- `test/security/`
- `README.md`

## Scope

Implement:

- User ownership checks.
- Internal endpoint authentication.
- Error sanitization.
- Run timeline/debug helpers.
- Cost/token logging fields where provider data is available.
- End-to-end smoke test with mocked providers.
- Documentation for local development and test commands.

Do not implement:

- Billing.
- Organization/team permission models.
- Complex production monitoring stack.

## Security Requirements

- User-facing routes require an authenticated user or explicit local dev user stub.
- Users can only access their own assistants, runs, and digests.
- Internal routes require `INTERNAL_API_SECRET`.
- Provider API keys must only come from environment secrets.
- Raw provider errors must not be returned directly to end users.
- Raw LLM outputs can be stored, but access must be owner-scoped.

## Observability Requirements

Each run should expose:

- current status
- step-level events
- candidate count
- scored count
- selected paper IDs
- prompt versions
- LLM provider/model where available
- token usage and estimated cost where available
- email delivery status

## Error Shape

Use a stable public shape:

```json
{
  "error": {
    "code": "RUN_FAILED",
    "message": "The run failed while scoring candidates."
  }
}
```

Detailed provider messages belong in internal logs or sanitized run event details.

## Test Targets

Unit tests:

- Auth ownership guard.
- Internal secret guard.
- Error sanitizer.
- Run event formatting.

Integration tests:

- User cannot read another user's assistant.
- User cannot read another user's digest.
- Internal endpoint rejects missing or wrong secret.
- End-to-end manual run with mocked arXiv, LLM, and email.
- Email failure leaves digest visible.

Smoke test:

1. Create user.
2. Create assistant.
3. Insert fixture papers.
4. Trigger manual run.
5. Verify candidates, scores, digest, run events, and email status.

## Acceptance Criteria

- Core routes enforce ownership.
- Internal routes enforce internal auth.
- Public errors are sanitized.
- A mocked end-to-end run passes in CI/local test.
- Documentation explains how to run tests and start the app.

## Handoff Notes

Record:

- Auth strategy used for MVP.
- Any residual security gaps.
- How to run smoke tests.

