export interface PublicError {
  code: string;
  message: string;
}

export function sanitizePublicError(
  error: unknown,
  fallback: PublicError = {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred."
  }
): PublicError {
  if (isPublicError(error)) {
    return {
      code: error.code,
      message: error.message
    };
  }

  return fallback;
}

function isPublicError(value: unknown): value is PublicError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof (value as PublicError).code === "string" &&
    typeof (value as PublicError).message === "string"
  );
}
