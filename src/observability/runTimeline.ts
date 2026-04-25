import type { Digest, RunEvent, AssistantRun } from "../domain/types";

export interface RunTimeline {
  runId: string;
  status: AssistantRun["status"];
  startedAt?: string;
  finishedAt?: string;
  candidateCount: number;
  selectedPaperIds: string[];
  emailStatus?: Digest["emailStatus"];
  events: Array<{
    step: string;
    level: RunEvent["level"];
    message: string;
    createdAt: string;
  }>;
}

export function formatRunTimeline(input: {
  run: AssistantRun;
  events: RunEvent[];
  digest?: Digest | null;
}): RunTimeline {
  return {
    runId: input.run.id,
    status: input.run.status,
    startedAt: input.run.startedAt,
    finishedAt: input.run.finishedAt,
    candidateCount: input.digest?.candidateCount ?? 0,
    selectedPaperIds: selectedPaperIds(input.digest),
    emailStatus: input.digest?.emailStatus,
    events: input.events.map((event) => ({
      step: event.step,
      level: event.level,
      message: event.message,
      createdAt: event.createdAt
    }))
  };
}

function selectedPaperIds(digest: Digest | null | undefined): string[] {
  if (!digest) {
    return [];
  }

  return digest.selectedPapers
    .map((paper) =>
      typeof paper === "object" &&
      paper !== null &&
      !Array.isArray(paper) &&
      typeof paper.arxiv_id === "string"
        ? paper.arxiv_id
        : undefined
    )
    .filter((arxivId): arxivId is string => Boolean(arxivId));
}
