import { MockLlmProvider } from "../llm/mockProvider";
import { AzureOpenAiLlmProvider } from "../llm/azureOpenAiProvider";
import type { LlmProvider } from "../llm/provider";
import { MockEmailProvider } from "../email/provider";
import {
  createInMemoryRepositories,
  createSupabaseClient,
  createSupabaseRepositories,
  type Repositories
} from "../db";
import { validateEnv, type AppConfig, type WorkerBindings } from "../env";
import type { AppOptions } from "./types";
import type { EmailProvider } from "../domain/providers";

let localMockRepositories: Repositories | undefined;

function resolveConfig(env: Partial<WorkerBindings>): AppConfig {
  return validateEnv(env);
}

export function resolveRepositories(
  env: Partial<WorkerBindings>,
  options: AppOptions
): Repositories {
  if (options.repositories) {
    return options.repositories;
  }

  const config = resolveConfig(env);

  if (
    config.useMockProviders &&
    (!config.supabaseUrl || !config.supabaseServiceRoleKey)
  ) {
    localMockRepositories ??= createInMemoryRepositories();
    return localMockRepositories;
  }

  return createSupabaseRepositories(createSupabaseClient(config));
}

export function resolveLlmProvider(
  env: Partial<WorkerBindings>,
  options: AppOptions
): LlmProvider {
  if (options.llmProvider) {
    return options.llmProvider;
  }

  const config = resolveConfig(env);

  if (config.useMockProviders || config.llmProvider === "mock") {
    return new MockLlmProvider();
  }

  if (config.llmProvider === "azure-openai") {
    return new AzureOpenAiLlmProvider({
      endpoint: required(config.azureOpenAiEndpoint, "AZURE_OPENAI_ENDPOINT"),
      apiKey: required(config.azureOpenAiApiKey, "AZURE_OPENAI_API_KEY"),
      deployment: required(config.azureOpenAiDeployment, "AZURE_OPENAI_DEPLOYMENT"),
      apiVersion: required(config.azureOpenAiApiVersion, "AZURE_OPENAI_API_VERSION")
    });
  }

  throw new Error("Real LLM provider is not implemented yet");
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function resolveEmailProvider(
  env: Partial<WorkerBindings>,
  options: AppOptions
): EmailProvider {
  if (options.emailProvider) {
    return options.emailProvider;
  }

  const config = resolveConfig(env);

  if (config.useMockProviders || config.emailProvider === "mock") {
    return new MockEmailProvider();
  }

  throw new Error("Real email provider is not implemented yet");
}

export function resolveAllDependencies(
  env: Partial<WorkerBindings>,
  options: AppOptions
): {
  repositories: Repositories;
  llmProvider: LlmProvider;
  emailProvider: EmailProvider;
} {
  return {
    repositories: resolveRepositories(env, options),
    llmProvider: resolveLlmProvider(env, options),
    emailProvider: resolveEmailProvider(env, options)
  };
}
