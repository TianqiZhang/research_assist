export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function findMatchedTerms(text: string, terms: string[]): string[] {
  const normalizedText = normalizeText(text);
  const seen = new Set<string>();
  const matches: string[] = [];

  for (const term of terms) {
    const normalizedTerm = normalizeText(term);

    if (!normalizedTerm || seen.has(normalizedTerm)) {
      continue;
    }

    if (normalizedText.includes(normalizedTerm)) {
      seen.add(normalizedTerm);
      matches.push(term);
    }
  }

  return matches;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
