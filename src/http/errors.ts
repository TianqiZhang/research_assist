export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
  };
}

export class HttpError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 500) {
    super(message);
    this.name = "HttpError";
    this.code = code;
    this.status = status;
  }
}

export function errorBody(code: string, message: string): ErrorResponseBody {
  return {
    error: {
      code,
      message
    }
  };
}

export function jsonError(code: string, message: string, status = 500): Response {
  return Response.json(errorBody(code, message), { status });
}
