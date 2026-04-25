let nextFallbackId = 1;

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const id = nextFallbackId.toString().padStart(12, "0");
  nextFallbackId += 1;
  return `00000000-0000-4000-8000-${id}`;
}
