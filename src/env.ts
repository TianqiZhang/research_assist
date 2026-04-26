export interface WorkerBindings {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  LLM_PROVIDER?: string;
  LLM_API_KEY?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  AZURE_OPENAI_API_KEY?: string;
  AZURE_OPENAI_DEPLOYMENT?: string;
  AZURE_OPENAI_API_VERSION?: string;
  EMAIL_PROVIDER?: string;
  EMAIL_API_KEY?: string;
  INTERNAL_API_SECRET?: string;
  APP_BASE_URL?: string;
  USE_MOCK_PROVIDERS?: string;
  NODE_ENV?: string;
}

export interface AppConfig {
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  llmProvider: string;
  llmApiKey?: string;
  azureOpenAiEndpoint?: string;
  azureOpenAiApiKey?: string;
  azureOpenAiDeployment?: string;
  azureOpenAiApiVersion?: string;
  emailProvider: string;
  emailApiKey?: string;
  internalApiSecret: string;
  appBaseUrl: string;
  useMockProviders: boolean;
}

export class EnvValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment: ${issues.join("; ")}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

const REQUIRED_CORE_KEYS = [
  "LLM_PROVIDER",
  "EMAIL_PROVIDER",
  "INTERNAL_API_SECRET",
  "APP_BASE_URL"
] as const;

const REQUIRED_REAL_PROVIDER_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

export function validateEnv(env: Partial<WorkerBindings> = {}): AppConfig {
  const issues: string[] = [];
  const useMockProviders = shouldUseMockProviders(env, issues);
  const requiredKeys = useMockProviders
    ? REQUIRED_CORE_KEYS
    : [...REQUIRED_CORE_KEYS, ...REQUIRED_REAL_PROVIDER_KEYS];

  for (const key of requiredKeys) {
    if (!hasValue(env[key])) {
      issues.push(`${key} is required`);
    }
  }

  const llmProvider = env.LLM_PROVIDER?.trim() ?? "";
  const emailProvider = env.EMAIL_PROVIDER?.trim() ?? "";

  if (!useMockProviders) {
    validateLlmProvider(env, llmProvider, issues);
    validateEmailProvider(env, emailProvider, issues);
  }

  if (hasValue(env.SUPABASE_URL) && !isValidUrl(env.SUPABASE_URL)) {
    issues.push("SUPABASE_URL must be a valid URL");
  }

  if (
    hasValue(env.AZURE_OPENAI_ENDPOINT) &&
    !isValidUrl(env.AZURE_OPENAI_ENDPOINT)
  ) {
    issues.push("AZURE_OPENAI_ENDPOINT must be a valid URL");
  }

  if (hasValue(env.APP_BASE_URL) && !isValidUrl(env.APP_BASE_URL)) {
    issues.push("APP_BASE_URL must be a valid URL");
  }

  if (issues.length > 0) {
    throw new EnvValidationError(issues);
  }

  return {
    supabaseUrl: normalizeOptional(env.SUPABASE_URL),
    supabaseServiceRoleKey: normalizeOptional(env.SUPABASE_SERVICE_ROLE_KEY),
    llmProvider,
    llmApiKey: normalizeOptional(env.LLM_API_KEY),
    azureOpenAiEndpoint: normalizeOptional(env.AZURE_OPENAI_ENDPOINT),
    azureOpenAiApiKey: normalizeOptional(env.AZURE_OPENAI_API_KEY),
    azureOpenAiDeployment: normalizeOptional(env.AZURE_OPENAI_DEPLOYMENT),
    azureOpenAiApiVersion: normalizeOptional(env.AZURE_OPENAI_API_VERSION),
    emailProvider,
    emailApiKey: normalizeOptional(env.EMAIL_API_KEY),
    internalApiSecret: env.INTERNAL_API_SECRET?.trim() ?? "",
    appBaseUrl: env.APP_BASE_URL?.trim() ?? "",
    useMockProviders
  };
}

function validateLlmProvider(
  env: Partial<WorkerBindings>,
  llmProvider: string,
  issues: string[]
): void {
  if (!hasValue(llmProvider) || llmProvider === "mock") {
    return;
  }

  if (llmProvider === "azure-openai") {
    for (const key of [
      "AZURE_OPENAI_ENDPOINT",
      "AZURE_OPENAI_API_KEY",
      "AZURE_OPENAI_DEPLOYMENT",
      "AZURE_OPENAI_API_VERSION"
    ] as const) {
      if (!hasValue(env[key])) {
        issues.push(`${key} is required`);
      }
    }
    return;
  }

  if (!hasValue(env.LLM_API_KEY)) {
    issues.push("LLM_API_KEY is required");
  }
}

function validateEmailProvider(
  env: Partial<WorkerBindings>,
  emailProvider: string,
  issues: string[]
): void {
  if (!hasValue(emailProvider) || emailProvider === "mock") {
    return;
  }

  if (!hasValue(env.EMAIL_API_KEY)) {
    issues.push("EMAIL_API_KEY is required");
  }
}

function shouldUseMockProviders(
  env: Partial<WorkerBindings>,
  issues: string[]
): boolean {
  const parsedMockFlag = parseOptionalBoolean(env.USE_MOCK_PROVIDERS);

  if (parsedMockFlag === "invalid") {
    issues.push("USE_MOCK_PROVIDERS must be true or false when set");
    return false;
  }

  return parsedMockFlag || isTestEnvironment(env);
}

function isTestEnvironment(env: Partial<WorkerBindings>): boolean {
  const nodeEnv =
    env.NODE_ENV ?? (typeof process === "undefined" ? undefined : process.env.NODE_ENV);

  return nodeEnv === "test";
}

function parseOptionalBoolean(value: string | undefined): boolean | "invalid" {
  if (!hasValue(value)) {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no"].includes(normalized)) {
    return false;
  }

  return "invalid";
}

function normalizeOptional(value: string | undefined): string | undefined {
  return hasValue(value) ? value.trim() : undefined;
}

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
