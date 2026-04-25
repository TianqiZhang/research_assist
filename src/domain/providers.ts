export interface DatabaseProvider {
  health(): Promise<ProviderHealth>;
}

export interface LlmJsonRequest {
  promptVersion: string;
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
}

export interface LlmJsonResponse<T> {
  parsed: T;
  rawOutput: string;
  model: string;
}

export interface LlmProvider {
  generateJson<T>(request: LlmJsonRequest): Promise<LlmJsonResponse<T>>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  providerMessageId: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export interface ProviderHealth {
  ok: boolean;
  message?: string;
}
