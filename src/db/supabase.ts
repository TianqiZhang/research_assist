import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { AppConfig, WorkerBindings } from "../env";
import { EnvValidationError, validateEnv } from "../env";

export type ResearchSupabaseClient = SupabaseClient;

export function createSupabaseClient(config: AppConfig): ResearchSupabaseClient {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new EnvValidationError([
      "SUPABASE_URL is required for Supabase repositories",
      "SUPABASE_SERVICE_ROLE_KEY is required for Supabase repositories"
    ]);
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function createSupabaseClientFromEnv(
  env: Partial<WorkerBindings>
): ResearchSupabaseClient {
  return createSupabaseClient(validateEnv(env));
}
