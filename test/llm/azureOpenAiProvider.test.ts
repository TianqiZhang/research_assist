import { describe, expect, it } from "vitest";

import { AzureOpenAiLlmProvider } from "../../src/llm/azureOpenAiProvider";

describe("AzureOpenAiLlmProvider", () => {
  it("posts chat completion requests and parses JSON message content", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const provider = new AzureOpenAiLlmProvider({
      endpoint: "https://example.openai.azure.com/openai/deployments/research-gpt",
      apiKey: "secret-key",
      deployment: "research-gpt",
      apiVersion: "2024-10-21",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response(
          JSON.stringify({
            model: "research-gpt",
            choices: [
              {
                message: {
                  content: JSON.stringify({ ok: true, score: 7 })
                }
              }
            ]
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        );
      }
    });

    const response = await provider.generateJson<{ ok: boolean; score: number }>({
      promptVersion: "test-prompt-v1",
      schemaName: "test_schema",
      systemPrompt: "Return JSON.",
      userPrompt: "Score this."
    });

    expect(response).toEqual({
      parsed: {
        ok: true,
        score: 7
      },
      rawOutput: JSON.stringify({ ok: true, score: 7 }),
      model: "research-gpt"
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://example.openai.azure.com/openai/deployments/research-gpt/chat/completions?api-version=2024-10-21"
    );
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers).toMatchObject({
      "api-key": "secret-key",
      "content-type": "application/json"
    });

    const body = JSON.parse(String(calls[0].init.body)) as {
      response_format: { type: string };
      max_completion_tokens: number;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.max_completion_tokens).toBe(4096);
    expect(body.messages).toEqual([
      {
        role: "system",
        content: "Return JSON."
      },
      {
        role: "user",
        content: "Score this."
      }
    ]);
  });

  it("throws when Azure returns a non-2xx response", async () => {
    const provider = new AzureOpenAiLlmProvider({
      endpoint: "https://example.openai.azure.com",
      apiKey: "secret-key",
      deployment: "research-gpt",
      apiVersion: "2024-10-21",
      fetcher: async () =>
        new Response(JSON.stringify({ error: { message: "bad request" } }), {
          status: 400
        })
    });

    await expect(
      provider.generateJson({
        promptVersion: "test-prompt-v1",
        schemaName: "test_schema",
        systemPrompt: "Return JSON.",
        userPrompt: "Score this."
      })
    ).rejects.toThrow(/Azure OpenAI request failed with status 400/);
  });

  it("throws when message content is not valid JSON", async () => {
    const provider = new AzureOpenAiLlmProvider({
      endpoint: "https://example.openai.azure.com",
      apiKey: "secret-key",
      deployment: "research-gpt",
      apiVersion: "2024-10-21",
      fetcher: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "not json"
                }
              }
            ]
          }),
          { status: 200 }
        )
    });

    await expect(
      provider.generateJson({
        promptVersion: "test-prompt-v1",
        schemaName: "test_schema",
        systemPrompt: "Return JSON.",
        userPrompt: "Score this."
      })
    ).rejects.toThrow(/Azure OpenAI returned invalid JSON/);
  });
});
