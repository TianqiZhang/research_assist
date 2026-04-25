export class DatabaseError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DatabaseError";
    this.cause = cause;
  }
}

export function assertFound<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new DatabaseError(message);
  }

  return value;
}
