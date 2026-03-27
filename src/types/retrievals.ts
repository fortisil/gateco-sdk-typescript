/**
 * Types for retrieval endpoints.
 */

/** Reason a retrieval result was denied. */
export interface DenialReason {
  code: string;
  message?: string;
  policy_id?: string;
}

/** Trace of a policy evaluation during retrieval. */
export interface PolicyTrace {
  policy_id: string;
  policy_name?: string;
  decision: string;
  reason?: string;
  duration_ms?: number;
}

/** A single result item within a retrieval response. */
export interface RetrievalOutcome {
  resource_id: string;
  external_resource_id?: string;
  score?: number;
  granted: boolean;
  denial_reason?: DenialReason;
  policy_traces: PolicyTrace[];
  metadata: Record<string, unknown>;
  text?: string;
}

/** Request body for `POST /api/retrievals/execute`. */
export interface ExecuteRetrievalRequest {
  query_vector?: number[];
  query?: string;
  principal_id: string;
  connector_id: string;
  top_k?: number;
  filters?: Record<string, unknown>;
  include_unresolved?: boolean;
  search_mode?: "vector" | "keyword" | "hybrid" | "grep";
  alpha?: number;
  pattern_type?: "substring" | "regex";
  case_sensitive?: boolean;
}

/** Typed inline metadata for policy evaluation (filter endpoint). */
export interface CandidatePolicyMetadata {
  classification?: string;
  sensitivity?: string;
  domain?: string;
  labels?: string[];
  encryption_mode?: string;
}

/** A candidate passed to the filter endpoint. */
export interface FilterCandidate {
  vector_id: string;
  score?: number | null;
  text?: string | null;
  resource_id?: string;
  metadata?: CandidatePolicyMetadata;
}

/** A single result from the filter endpoint. */
export interface FilterResult {
  vector_id: string;
  score?: number | null;
  text?: string | null;
  resource_id?: string | null;
  resource_mode: "registered" | "synthetic" | "unresolved";
  granted: boolean;
  policy_decision: "allowed" | "denied";
  denial_reason?: string | null;
}

/** Full retrieval record returned by list / get / execute endpoints. */
export interface SecuredRetrieval {
  id: string;
  query?: string;
  principal_id?: string;
  connector_id?: string;
  organization_id?: string;
  status?: string;
  total_results: number;
  granted_count: number;
  denied_count: number;
  outcomes: RetrievalOutcome[];
  created_at?: string;
  duration_ms?: number;
  metadata: Record<string, unknown>;
  /** Filter-specific fields (present when mode is "filter"). */
  mode?: string;
  outcome?: string;
  matched_chunks?: number;
  allowed_chunks?: number;
  denied_chunks?: number;
  results?: FilterResult[];
  denial_reasons?: string[];
  policy_trace?: PolicyTrace[];
  latency_ms?: number;
  search_mode?: string;
  keyword_latency_ms?: number;
  vector_latency_ms?: number;
  pattern_type?: string;
  match_count?: number;
  sort_order?: string;
}

/** Parse a raw JSON object into a FilterResult. */
export function parseFilterResult(data: Record<string, unknown>): FilterResult {
  return {
    vector_id: data["vector_id"] as string,
    score: data["score"] as number | null | undefined,
    text: data["text"] as string | null | undefined,
    resource_id: data["resource_id"] as string | null | undefined,
    resource_mode: data["resource_mode"] as "registered" | "synthetic" | "unresolved",
    granted: (data["granted"] as boolean) ?? false,
    policy_decision: data["policy_decision"] as "allowed" | "denied",
    denial_reason: data["denial_reason"] as string | null | undefined,
  };
}

/** Parse a raw JSON object into a SecuredRetrieval. */
export function parseSecuredRetrieval(data: Record<string, unknown>): SecuredRetrieval {
  return {
    id: (data["id"] ?? data["retrieval_id"]) as string,
    query: data["query"] as string | undefined,
    principal_id: data["principal_id"] as string | undefined,
    connector_id: data["connector_id"] as string | undefined,
    organization_id: data["organization_id"] as string | undefined,
    status: data["status"] as string | undefined,
    total_results: (data["total_results"] as number) ?? 0,
    granted_count: (data["granted_count"] as number) ?? 0,
    denied_count: (data["denied_count"] as number) ?? 0,
    outcomes: Array.isArray(data["outcomes"])
      ? (data["outcomes"] as Record<string, unknown>[]).map(parseRetrievalOutcome)
      : [],
    created_at: data["created_at"] as string | undefined,
    duration_ms: data["duration_ms"] as number | undefined,
    metadata: (data["metadata"] as Record<string, unknown>) ?? {},
    mode: data["mode"] as string | undefined,
    outcome: data["outcome"] as string | undefined,
    matched_chunks: data["matched_chunks"] as number | undefined,
    allowed_chunks: data["allowed_chunks"] as number | undefined,
    denied_chunks: data["denied_chunks"] as number | undefined,
    results: Array.isArray(data["results"])
      ? (data["results"] as Record<string, unknown>[]).map(parseFilterResult)
      : undefined,
    denial_reasons: data["denial_reasons"] as string[] | undefined,
    policy_trace: Array.isArray(data["policy_trace"])
      ? (data["policy_trace"] as Record<string, unknown>[]).map(parsePolicyTrace)
      : undefined,
    latency_ms: data["latency_ms"] as number | undefined,
    search_mode: data["search_mode"] as string | undefined,
    keyword_latency_ms: data["keyword_latency_ms"] as number | undefined,
    vector_latency_ms: data["vector_latency_ms"] as number | undefined,
    pattern_type: data["pattern_type"] as string | undefined,
    match_count: data["match_count"] as number | undefined,
    sort_order: data["sort_order"] as string | undefined,
  };
}

/** Parse a raw JSON object into a RetrievalOutcome. */
export function parseRetrievalOutcome(data: Record<string, unknown>): RetrievalOutcome {
  return {
    resource_id: data["resource_id"] as string,
    external_resource_id: data["external_resource_id"] as string | undefined,
    score: data["score"] as number | undefined,
    granted: (data["granted"] as boolean) ?? false,
    denial_reason: data["denial_reason"]
      ? parseDenialReason(data["denial_reason"] as Record<string, unknown>)
      : undefined,
    policy_traces: Array.isArray(data["policy_traces"])
      ? (data["policy_traces"] as Record<string, unknown>[]).map(parsePolicyTrace)
      : [],
    metadata: (data["metadata"] as Record<string, unknown>) ?? {},
    text: data["text"] as string | undefined,
  };
}

/** Parse a raw JSON object into a DenialReason. */
export function parseDenialReason(data: Record<string, unknown>): DenialReason {
  return {
    code: data["code"] as string,
    message: data["message"] as string | undefined,
    policy_id: data["policy_id"] as string | undefined,
  };
}

/** Parse a raw JSON object into a PolicyTrace. */
export function parsePolicyTrace(data: Record<string, unknown>): PolicyTrace {
  return {
    policy_id: data["policy_id"] as string,
    policy_name: data["policy_name"] as string | undefined,
    decision: data["decision"] as string,
    reason: data["reason"] as string | undefined,
    duration_ms: data["duration_ms"] as number | undefined,
  };
}
