# 01 Project Foundation

## Goal

Create the initial TypeScript Worker project scaffold so all later components have a consistent runtime, local development flow, test setup, and environment configuration.

## Dependencies

None.

## Owned Areas

Suggested files and directories:

- `package.json`
- `tsconfig.json`
- `wrangler.toml`
- `vitest.config.ts`
- `src/index.ts`
- `src/env.ts`
- `src/http/`
- `test/`
- `.env.example`
- `README.md`

## Scope

Implement:

- TypeScript project setup.
- Cloudflare Worker entrypoint.
- Basic HTTP router.
- Health endpoint.
- Environment validation.
- Local test framework.
- Placeholder provider interfaces for database, LLM, and email.

Do not implement:

- Real database queries.
- Real arXiv fetching.
- Real LLM calls.
- Real email sending.
- Production authentication.

## Required Endpoints

### `GET /health`

Response:

```json
{
  "ok": true,
  "service": "research-assistant"
}
```

## Environment Variables

Define these in `.env.example` and validate them in `src/env.ts`.

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LLM_PROVIDER=
LLM_API_KEY=
EMAIL_PROVIDER=
EMAIL_API_KEY=
INTERNAL_API_SECRET=
APP_BASE_URL=
```

For local mocked development, allow missing provider keys when `NODE_ENV=test` or `USE_MOCK_PROVIDERS=true`.

## Implementation Notes

- Use a small router that can be extended by later components.
- Keep route handlers thin and move business logic into modules.
- Export pure helpers where possible so later specs can unit test without a Worker runtime.
- Add a simple error response helper with stable shape:

```json
{
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

## Tests

Add tests for:

- Health endpoint.
- Environment validation success.
- Environment validation failure.
- JSON error response helper.

## Acceptance Criteria

- `npm install` succeeds.
- `npm test` succeeds.
- Local Worker dev server can start.
- `GET /health` returns the expected JSON.
- Later agents can add routes without replacing the scaffold.

## Handoff Notes

After completion, update `specs/progress.md`.

