import type { Assistant } from "../domain/types";

export function isAssistantDue(assistant: Assistant, now: Date): boolean {
  if (!assistant.isActive || !assistant.scheduleCron) {
    return false;
  }

  const parts = assistant.scheduleCron.trim().split(/\s+/);

  if (parts.length !== 5) {
    return false;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return (
    fieldMatches(minute, now.getUTCMinutes()) &&
    fieldMatches(hour, now.getUTCHours()) &&
    fieldMatches(dayOfMonth, now.getUTCDate()) &&
    fieldMatches(month, now.getUTCMonth() + 1) &&
    fieldMatches(dayOfWeek, now.getUTCDay())
  );
}

function fieldMatches(field: string, value: number): boolean {
  if (field === "*") {
    return true;
  }

  return field.split(",").some((part) => Number(part) === value);
}
