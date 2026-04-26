import type { LlmJsonRequest, LlmJsonResponse, LlmProvider } from "./provider";

export interface AzureOpenAiProviderOptions {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
  fetcher?: typeof fetch;
}

interface AzureChatCompletionResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export class AzureOpenAiLlmProvider implements LlmProvider {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly deployment: string;
  private readonly apiVersion: string;
  private readonly fetcher: typeof fetch;

  constructor(options: AzureOpenAiProviderOptions) {
    this.endpoint = normalizeEndpoint(options.endpoint);
    this.apiKey = options.apiKey;
    this.deployment = options.deployment;
    this.apiVersion = options.apiVersion;
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  }

  async generateJson<T>(request: LlmJsonRequest): Promise<LlmJsonResponse<T>> {
    const response = await this.fetcher(this.url(), {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: request.systemPrompt
          },
          {
            role: "user",
            content: request.userPrompt
          }
        ],
        response_format: {
          type: "json_object"
        },
        temperature: 0.2,
        max_completion_tokens: 4096
      })
    });

    const bodyText = await response.text();

    if (!response.ok) {
      throw new Error(
        `Azure OpenAI request failed with status ${response.status}: ${bodyText.slice(0, 500)}`
      );
    }

    const body = parseJson<AzureChatCompletionResponse>(bodyText);
    const rawOutput = body.choices?.[0]?.message?.content;

    if (typeof rawOutput !== "string" || rawOutput.trim().length === 0) {
      throw new Error("Azure OpenAI response did not include message content");
    }

    return {
      parsed: parseJson<T>(rawOutput),
      rawOutput,
      model: body.model ?? this.deployment
    };
  }

  private url(): string {
    const deployment = encodeURIComponent(this.deployment);
    const apiVersion = encodeURIComponent(this.apiVersion);
    return `${this.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  }
}

function normalizeEndpoint(endpoint: string): string {
  try {
    return new URL(endpoint).origin;
  } catch {
    return endpoint.replace(/\/+$/, "");
  }
}

function parseJson<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(
      `Azure OpenAI returned invalid JSON: ${
        error instanceof Error ? error.message : "Unknown parse error"
      }`
    );
  }
}
