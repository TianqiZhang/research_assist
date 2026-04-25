# Research Assistant

Configurable AI research assistant MVP. The active implementation plan lives in `specs/`.

## Local Development

Install dependencies:

```sh
npm install
```

Run tests:

```sh
npm test
```

Run type checks:

```sh
npm run typecheck
```

Start the local Worker:

```sh
npm run dev
```

The first endpoint is:

```text
GET /health
```

Expected response:

```json
{
  "ok": true,
  "service": "research-assistant"
}
```

For local mocked development, `wrangler.toml` sets `USE_MOCK_PROVIDERS=true` so provider credentials can be omitted.

When mock providers are enabled and Supabase credentials are not present, the Worker uses a process-local in-memory repository. This is intended for local UI/workflow smoke tests only.

## MVP Auth And Internal Routes

The MVP uses a single-user dev stub:

```text
user_id=00000000-0000-4000-8000-000000000001
```

Internal routes require either:

```text
x-internal-api-secret: <INTERNAL_API_SECRET>
```

or:

```text
Authorization: Bearer <INTERNAL_API_SECRET>
```

## Test Coverage

Default tests are fully mocked/local and cover migrations, repositories, arXiv parsing/cache refresh, assistant/profile flows, candidate generation, LLM scoring validation, digest generation, workflow/email behavior, frontend rendering, ownership checks, and an end-to-end mocked manual run.

## Database Migrations

Core schema migrations live in `migrations/`.

Apply the initial migration to Supabase or local Postgres with:

```sh
psql "$DATABASE_URL" -f migrations/0001_core_schema.sql
```

Default tests do not require Supabase credentials. `npm test` applies the migration against PGlite and exercises the repository contracts with in-memory repositories.
