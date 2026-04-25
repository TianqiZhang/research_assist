import { DEV_USER_ID } from "../domain/assistants";
import type { Assistant, Digest } from "../domain/types";

export function getCurrentUserId(): string {
  return DEV_USER_ID;
}

export function userOwnsAssistant(assistant: Assistant | null, userId = DEV_USER_ID): boolean {
  return Boolean(assistant && assistant.userId === userId);
}

export function userOwnsDigest(
  digest: Digest | null,
  assistant: Assistant | null,
  userId = DEV_USER_ID
): boolean {
  return Boolean(digest && assistant && assistant.userId === userId);
}

export function hasInternalSecret(input: {
  headerSecret?: string;
  authorization?: string;
  expectedSecret?: string;
}): boolean {
  if (!input.expectedSecret) {
    return false;
  }

  const bearer = input.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return input.headerSecret === input.expectedSecret || bearer === input.expectedSecret;
}
