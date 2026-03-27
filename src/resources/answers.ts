/**
 * Answers resource -- grounded answer synthesis from allowed retrieval chunks.
 */

import type { GatecoClient } from "../client.js";
import type { AnswerResponse } from "../types/answers.js";
import { parseAnswerResponse } from "../types/answers.js";

/** Options for executing answer synthesis. */
export interface ExecuteAnswerOptions {
  /** Natural language question. */
  query: string;
  /** Identity of the requesting principal. */
  principalId: string;
  /** Connector to search against. */
  connectorId: string;
  /** Maximum number of chunks to retrieve. */
  topK?: number;
  /** Optional filter dict for scoping results. */
  filters?: Record<string, unknown>;
  /** Search mode for retrieval: vector, keyword, or hybrid. Grep excluded from answer synthesis. */
  searchMode?: "vector" | "keyword" | "hybrid";
  /** Hybrid weight: 1.0=all-vector, 0.0=all-keyword. Only for hybrid mode. */
  alpha?: number;
}

/** Namespace for answer synthesis endpoints. Accessed as `client.answers`. */
export class AnswersResource {
  constructor(private readonly client: GatecoClient) {}

  /** Execute grounded answer synthesis from allowed retrieval chunks. */
  async execute(options: ExecuteAnswerOptions): Promise<AnswerResponse> {
    const body: Record<string, unknown> = {
      query: options.query,
      principal_id: options.principalId,
      connector_id: options.connectorId,
    };
    if (options.topK !== undefined) body["top_k"] = options.topK;
    if (options.filters !== undefined) body["filters"] = options.filters;
    if (options.searchMode !== undefined) body["search_mode"] = options.searchMode;
    if (options.alpha !== undefined) body["alpha"] = options.alpha;

    const data = await this.client._request("POST", "/api/answers/execute", {
      json: body,
    });
    return parseAnswerResponse(data as Record<string, unknown>);
  }
}
