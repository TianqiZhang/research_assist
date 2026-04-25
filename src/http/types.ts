import type { ArxivFeedClient, RefreshLogger } from "../arxiv/types";
import type { Repositories } from "../db/repositories";
import type { EmailProvider } from "../domain/providers";
import type { WorkerBindings } from "../env";
import type { LlmProvider } from "../llm/provider";

export type AppBindings = {
  Bindings: WorkerBindings;
};

export interface AppOptions {
  arxivClient?: ArxivFeedClient;
  fetcher?: typeof fetch;
  logger?: RefreshLogger;
  llmProvider?: LlmProvider;
  emailProvider?: EmailProvider;
  now?: () => Date;
  repositories?: Repositories;
}
