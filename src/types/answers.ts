/**
 * Types for answer synthesis endpoints.
 */

/** A citation referencing a source chunk used in the answer. */
export interface Citation {
  index: number;
  resource_id?: string;
  vector_id: string;
  text_excerpt: string;
  score?: number;
}

/** Response from `POST /api/answers/execute`. */
export interface AnswerResponse {
  answer: string | null;
  outcome: string;
  is_partial: boolean;
  citations: Citation[];
  retrieval_id?: string;
  allowed_chunks: number;
  denied_chunks: number;
  model?: string | null;
  retrieval_latency_ms?: number;
  synthesis_latency_ms?: number;
  total_latency_ms?: number;
  chunks_available?: number;
  chunks_used_initial?: number;
  chunks_used_final?: number;
  retry_used?: boolean;
  llm_calls?: number;
}

/** Request body for `POST /api/answers/execute`. */
export interface ExecuteAnswerRequest {
  query: string;
  principal_id: string;
  connector_id: string;
  top_k?: number;
  filters?: Record<string, unknown>;
  search_mode?: "vector" | "keyword" | "hybrid";
  alpha?: number;
}

/** Parse a raw JSON object into a Citation. */
export function parseCitation(data: Record<string, unknown>): Citation {
  return {
    index: (data["index"] as number) ?? 0,
    resource_id: data["resource_id"] as string | undefined,
    vector_id: (data["vector_id"] as string) ?? "",
    text_excerpt: (data["text_excerpt"] as string) ?? "",
    score: data["score"] as number | undefined,
  };
}

/** Parse a raw JSON object into an AnswerResponse. */
export function parseAnswerResponse(data: Record<string, unknown>): AnswerResponse {
  return {
    answer: data["answer"] as string | null,
    outcome: (data["outcome"] as string) ?? "no_access",
    is_partial: (data["is_partial"] as boolean) ?? false,
    citations: Array.isArray(data["citations"])
      ? (data["citations"] as Record<string, unknown>[]).map(parseCitation)
      : [],
    retrieval_id: data["retrieval_id"] as string | undefined,
    allowed_chunks: (data["allowed_chunks"] as number) ?? 0,
    denied_chunks: (data["denied_chunks"] as number) ?? 0,
    model: data["model"] as string | null | undefined,
    retrieval_latency_ms: data["retrieval_latency_ms"] as number | undefined,
    synthesis_latency_ms: data["synthesis_latency_ms"] as number | undefined,
    total_latency_ms: data["total_latency_ms"] as number | undefined,
    chunks_available: data["chunks_available"] as number | undefined,
    chunks_used_initial: data["chunks_used_initial"] as number | undefined,
    chunks_used_final: data["chunks_used_final"] as number | undefined,
    retry_used: (data["retry_used"] as boolean) ?? false,
    llm_calls: (data["llm_calls"] as number) ?? 0,
  };
}
