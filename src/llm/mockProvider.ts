import type { JsonValue } from "../domain/types";
import type { LlmJsonRequest, LlmJsonResponse, LlmProvider } from "./provider";

export type MockLlmResponse = JsonValue | string | Error;

export class MockLlmProvider implements LlmProvider {
  readonly calls: LlmJsonRequest[] = [];
  private readonly responses: MockLlmResponse[];

  constructor(responses: MockLlmResponse[] = [defaultProfileCompilerResponse()]) {
    this.responses = [...responses];
  }

  async generateJson<T>(request: LlmJsonRequest): Promise<LlmJsonResponse<T>> {
    this.calls.push(request);

    const response = this.responses.length > 0
      ? this.responses.shift()
      : defaultProfileCompilerResponse();

    if (response instanceof Error) {
      throw response;
    }

    if (typeof response === "string") {
      return {
        parsed: JSON.parse(response) as T,
        rawOutput: response,
        model: "mock-llm"
      };
    }

    return {
      parsed: response as T,
      rawOutput: JSON.stringify(response),
      model: "mock-llm"
    };
  }
}

export function defaultProfileCompilerResponse(): JsonValue {
  return {
    include_topics: ["AI agents", "tool use", "RAG"],
    exclude_topics: ["pure theory"],
    positive_signals: ["benchmark", "code"],
    negative_signals: ["no experiments"],
    scoring_rubric: {
      topic_relevance: 0.35,
      technical_quality: 0.25,
      practical_value: 0.25,
      novelty: 0.15
    }
  };
}
