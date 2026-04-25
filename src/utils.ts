export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  wrapError?: (lastError: unknown) => Error
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }

  if (wrapError) {
    throw wrapError(lastError);
  }

  throw lastError instanceof Error ? lastError : new Error("Operation failed after retries");
}
