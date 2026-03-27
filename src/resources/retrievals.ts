/**
 * Retrievals resource -- execute, list, get.
 */

import type { GatecoClient } from "../client.js";
import type { Page } from "../pagination.js";
import { parsePage, listAll } from "../pagination.js";
import type { SecuredRetrieval, FilterCandidate } from "../types/retrievals.js";
import { parseSecuredRetrieval } from "../types/retrievals.js";

/** Options for executing a permission-gated retrieval. */
export interface ExecuteRetrievalOptions {
  /** Optional embedding vector for similarity search. */
  queryVector?: number[];
  /** Identity of the requesting principal. */
  principalId: string;
  /** Connector to search against. */
  connectorId: string;
  /** Optional text query (used when the backend embeds for you). */
  query?: string;
  /** Maximum number of results to return. */
  topK?: number;
  /** Optional filter dict for scoping results. */
  filters?: Record<string, unknown>;
  /** Whether to include unresolved results. */
  includeUnresolved?: boolean;
  /** Search mode: vector (ANN), keyword (FTS), hybrid (vector+keyword), grep (exact match). */
  searchMode?: "vector" | "keyword" | "hybrid" | "grep";
  /** Hybrid weight: 1.0=all-vector, 0.0=all-keyword. Only for hybrid mode. */
  alpha?: number;
  /** Grep pattern type. Only for grep mode. */
  patternType?: "substring" | "regex";
  /** Case-sensitive grep matching. Only for grep mode. */
  caseSensitive?: boolean;
}

/** Options for applying policy filtering to external retrieval candidates. */
export interface FilterRetrievalOptions {
  /** Identity of the requesting principal. */
  principalId: string;
  /** Connector to evaluate policies against. */
  connectorId: string;
  /** Candidate results from an external retrieval source. */
  candidates: FilterCandidate[];
  /** Whether to include full policy evaluation trace. */
  includeTrace?: boolean;
}

/** Filter options for listing retrievals. */
export interface ListRetrievalsFilters {
  connector_id?: string;
  principal_id?: string;
  status?: string;
  [key: string]: string | number | boolean | undefined;
}

/** Namespace for retrieval endpoints. Accessed as `client.retrievals`. */
export class RetrievalsResource {
  constructor(private readonly client: GatecoClient) {}

  /** Execute a permission-gated retrieval. */
  async execute(options: ExecuteRetrievalOptions): Promise<SecuredRetrieval> {
    const body: Record<string, unknown> = {
      principal_id: options.principalId,
      connector_id: options.connectorId,
    };
    if (options.queryVector !== undefined) body["query_vector"] = options.queryVector;
    if (options.query !== undefined) body["query"] = options.query;
    if (options.topK !== undefined) body["top_k"] = options.topK;
    if (options.filters !== undefined) body["filters"] = options.filters;
    if (options.includeUnresolved !== undefined) body["include_unresolved"] = options.includeUnresolved;
    if (options.searchMode !== undefined) body["search_mode"] = options.searchMode;
    if (options.alpha !== undefined) body["alpha"] = options.alpha;
    if (options.patternType !== undefined) body["pattern_type"] = options.patternType;
    if (options.caseSensitive !== undefined) body["case_sensitive"] = options.caseSensitive;

    const data = await this.client._request("POST", "/api/retrievals/execute", {
      json: body,
    });
    return parseSecuredRetrieval(data as Record<string, unknown>);
  }

  /** Fetch a single page of retrieval records. */
  async list(
    page = 1,
    perPage = 20,
    filters: ListRetrievalsFilters = {},
  ): Promise<Page<SecuredRetrieval>> {
    const params: Record<string, string | number | boolean | undefined> = {
      page,
      per_page: perPage,
      ...filters,
    };
    const raw = await this.client._request("GET", "/api/retrievals", { params });
    return parsePage(raw, page, perPage, parseSecuredRetrieval);
  }

  /** Return an async generator over all retrieval records. */
  listAll(
    perPage = 100,
    filters: ListRetrievalsFilters = {},
  ): AsyncGenerator<SecuredRetrieval, void, undefined> {
    return listAll(
      async (page, pp) =>
        (await this.client._request("GET", "/api/retrievals", {
          params: { page, per_page: pp, ...filters },
        })) ?? {},
      parseSecuredRetrieval,
      perPage,
    );
  }

  /** Get a single retrieval by ID. */
  async get(retrievalId: string): Promise<SecuredRetrieval> {
    const data = await this.client._request("GET", `/api/retrievals/${retrievalId}`);
    return parseSecuredRetrieval(data as Record<string, unknown>);
  }

  /** Apply policy filtering to externally-sourced retrieval candidates. */
  async filter(options: FilterRetrievalOptions): Promise<SecuredRetrieval> {
    const body: Record<string, unknown> = {
      principal_id: options.principalId,
      connector_id: options.connectorId,
      candidates: options.candidates,
    };
    if (options.includeTrace !== undefined) body["include_trace"] = options.includeTrace;

    const data = await this.client._request("POST", "/api/retrievals/filter", {
      json: body,
    });
    return parseSecuredRetrieval(data as Record<string, unknown>);
  }
}
