import { describe, expect, it } from "vitest";

import { hasInternalSecret, userOwnsAssistant } from "../../src/http/auth";
import { sanitizePublicError } from "../../src/observability/errors";
import type { Assistant } from "../../src/domain/types";

describe("auth helpers", () => {
  it("accepts internal secrets from header or bearer token", () => {
    expect(
      hasInternalSecret({
        headerSecret: "secret",
        expectedSecret: "secret"
      })
    ).toBe(true);
    expect(
      hasInternalSecret({
        authorization: "Bearer secret",
        expectedSecret: "secret"
      })
    ).toBe(true);
    expect(
      hasInternalSecret({
        headerSecret: "wrong",
        expectedSecret: "secret"
      })
    ).toBe(false);
  });

  it("checks assistant ownership against the dev user", () => {
    expect(userOwnsAssistant(assistantWithUser("user-1"), "user-1")).toBe(true);
    expect(userOwnsAssistant(assistantWithUser("user-2"), "user-1")).toBe(false);
    expect(userOwnsAssistant(null, "user-1")).toBe(false);
  });
});

describe("sanitizePublicError", () => {
  it("does not expose raw provider errors by default", () => {
    expect(sanitizePublicError(new Error("OpenAI key leaked"))).toEqual({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred."
    });
  });

  it("passes through explicitly public errors", () => {
    expect(sanitizePublicError({ code: "RUN_FAILED", message: "Run failed." })).toEqual({
      code: "RUN_FAILED",
      message: "Run failed."
    });
  });
});

function assistantWithUser(userId: string): Assistant {
  return {
    id: "assistant",
    userId,
    name: "Assistant",
    description: "Description",
    arxivCategories: ["cs.AI"],
    timezone: "UTC",
    paperCount: 5,
    isActive: true,
    createdAt: "2026-04-25T00:00:00.000Z",
    updatedAt: "2026-04-25T00:00:00.000Z"
  };
}
