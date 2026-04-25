import type {
  AppendRunEventInput,
  ArxivPaper,
  Assistant,
  AssistantProfile,
  AssistantRun,
  CreateAssistantInput,
  CreateAssistantProfileInput,
  CreateAssistantRunInput,
  CreateDigestInput,
  CreateUserInput,
  Digest,
  InsertRunCandidateInput,
  InsertRunScoreInput,
  RunCandidate,
  RunEvent,
  RunScore,
  SearchRecentPapersInput,
  UpdateAssistantInput,
  UpdateDigestEmailStatusInput,
  UpdateRunStatusInput,
  User
} from "../domain/types";

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  getById(id: string): Promise<User | null>;
}

export interface AssistantRepository {
  listByUser(userId: string): Promise<Assistant[]>;
  getById(id: string): Promise<Assistant | null>;
  create(input: CreateAssistantInput): Promise<Assistant>;
  update(id: string, input: UpdateAssistantInput): Promise<Assistant>;
}

export interface AssistantProfileRepository {
  getLatest(assistantId: string): Promise<AssistantProfile | null>;
  getByVersion(assistantId: string, version: number): Promise<AssistantProfile | null>;
  create(input: CreateAssistantProfileInput): Promise<AssistantProfile>;
}

export interface ArxivPaperRepository {
  upsertMany(papers: ArxivPaper[]): Promise<ArxivPaper[]>;
  searchRecent(input: SearchRecentPapersInput): Promise<ArxivPaper[]>;
  getByIds(arxivIds: string[]): Promise<ArxivPaper[]>;
}

export interface AssistantRunRepository {
  create(input: CreateAssistantRunInput): Promise<AssistantRun>;
  getById(id: string): Promise<AssistantRun | null>;
  listByAssistant(assistantId: string): Promise<AssistantRun[]>;
  updateStatus(input: UpdateRunStatusInput): Promise<AssistantRun>;
}

export interface RunEventRepository {
  append(input: AppendRunEventInput): Promise<RunEvent>;
  listByRun(runId: string): Promise<RunEvent[]>;
}

export interface RunCandidateRepository {
  insertMany(runId: string, candidates: InsertRunCandidateInput[]): Promise<RunCandidate[]>;
  listByRun(runId: string): Promise<RunCandidate[]>;
}

export interface RunScoreRepository {
  insertMany(runId: string, scores: InsertRunScoreInput[]): Promise<RunScore[]>;
  listByRun(runId: string): Promise<RunScore[]>;
}

export interface DigestRepository {
  create(input: CreateDigestInput): Promise<Digest>;
  getById(id: string): Promise<Digest | null>;
  getByRunId(runId: string): Promise<Digest | null>;
  listByAssistant(assistantId: string): Promise<Digest[]>;
  updateEmailStatus(input: UpdateDigestEmailStatusInput): Promise<Digest>;
}

export type Repositories = {
  users: UserRepository;
  assistants: AssistantRepository;
  profiles: AssistantProfileRepository;
  papers: ArxivPaperRepository;
  runs: AssistantRunRepository;
  runEvents: RunEventRepository;
  candidates: RunCandidateRepository;
  scores: RunScoreRepository;
  digests: DigestRepository;
};
