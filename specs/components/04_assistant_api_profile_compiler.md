# 04 Assistant API and Profile Compiler

## Goal

Implement assistant CRUD APIs and compile natural-language assistant descriptions into versioned structured profiles.

## Dependencies

- `01_project_foundation`
- `02_database_repositories`

## Owned Areas

Suggested files and directories:

- `src/http/assistantRoutes.ts`
- `src/domain/assistants.ts`
- `src/llm/provider.ts`
- `src/llm/profileCompiler.ts`
- `src/llm/prompts/profileCompiler.ts`
- `test/assistants/`
- `test/llm/profileCompiler.test.ts`

## Scope

Implement:

- Assistant list/create/get/update/delete endpoints.
- LLM provider adapter interface.
- Mock LLM provider for tests.
- Profile compiler prompt and JSON validator.
- Profile versioning when assistant description changes.

Do not implement:

- Candidate scoring prompt.
- Workflow orchestration.
- Frontend screens.

## API Contracts

### `GET /assistants`

Returns assistants owned by current user.

### `POST /assistants`

Request:

```json
{
  "name": "Agent Papers",
  "description": "Find practical papers about AI agents, tool use, RAG, and evaluation.",
  "arxiv_categories": ["cs.AI", "cs.CL"],
  "schedule_cron": "0 8 * * 1",
  "timezone": "America/Los_Angeles",
  "paper_count": 5
}
```

Behavior:

- Create assistant.
- Compile initial profile.
- Return assistant and latest profile metadata.

### `PATCH /assistants/:id`

Behavior:

- Update assistant fields.
- If `description` changes, create a new compiled profile version.
- If only schedule/name/category changes, do not create a new profile unless needed.

### `DELETE /assistants/:id`

MVP behavior:

- Soft-delete or set `is_active=false`.

## Profile Compiler Output

```json
{
  "include_topics": ["AI agents", "tool use", "RAG"],
  "exclude_topics": ["pure theory"],
  "positive_signals": ["benchmark", "code"],
  "negative_signals": ["no experiments"],
  "scoring_rubric": {
    "topic_relevance": 0.35,
    "technical_quality": 0.25,
    "practical_value": 0.25,
    "novelty": 0.15
  }
}
```

## Validation Rules

- Required arrays must contain strings.
- Rubric keys must include:
  - `topic_relevance`
  - `technical_quality`
  - `practical_value`
  - `novelty`
- Rubric values must sum to 1.0 within 0.01.
- If rubric values are missing or invalid, use defaults and write a warning event where a run exists.

## Prompt Versioning

Define:

```ts
export const PROFILE_COMPILER_PROMPT_VERSION = "profile-compiler-v1";
```

Persist this value with every profile.

## Tests

Add tests for:

- Assistant create compiles profile.
- Description update creates incremented profile version.
- Non-description update does not create a new profile.
- Invalid LLM JSON is retried.
- Invalid rubric is normalized or rejected according to implementation choice.

## Acceptance Criteria

- Assistant CRUD works through HTTP routes.
- Profiles are versioned and retrievable.
- Raw model output and prompt version are stored.
- Tests can run with mocked LLM responses.

## Handoff Notes

Record:

- Chosen auth/user stub behavior.
- Exact profile validation behavior.
- Any API deviations.

