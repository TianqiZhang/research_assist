import { Hono } from "hono";

import { getHealth } from "../domain/health";
import { registerAssistantRoutes } from "./assistantRoutes";
import { registerDigestRoutes } from "./digestRoutes";
import { registerFrontendRoutes } from "./frontendRoutes";
import { registerInternalArxivRoutes } from "./internalArxivRoutes";
import { registerInternalCronRoutes } from "./internalCronRoutes";
import { registerRunRoutes } from "./runRoutes";
import { HttpError, jsonError } from "./errors";
import type { AppBindings, AppOptions } from "./types";

export function createApp(options: AppOptions = {}): Hono<AppBindings> {
  const app = new Hono<AppBindings>();

  app.get("/health", (c) => c.json(getHealth()));
  registerFrontendRoutes(app, options);
  registerAssistantRoutes(app, options);
  registerDigestRoutes(app, options);
  registerRunRoutes(app, options);
  registerInternalArxivRoutes(app, options);
  registerInternalCronRoutes(app, options);

  app.notFound(() => jsonError("not_found", "Route not found", 404));

  app.onError((error) => {
    if (error instanceof HttpError) {
      return jsonError(error.code, error.message, error.status);
    }

    return jsonError("internal_error", "Internal server error", 500);
  });

  return app;
}
