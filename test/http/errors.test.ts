import { describe, expect, it } from "vitest";

import { errorBody, jsonError } from "../../src/http/errors";

describe("JSON error responses", () => {
  it("builds the stable error body shape", () => {
    expect(errorBody("bad_request", "Invalid request")).toEqual({
      error: {
        code: "bad_request",
        message: "Invalid request"
      }
    });
  });

  it("returns a JSON response with the requested status", async () => {
    const response = jsonError("bad_request", "Invalid request", 400);

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "bad_request",
        message: "Invalid request"
      }
    });
  });
});
