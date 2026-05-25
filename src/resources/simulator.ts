/**
 * Simulator resource -- dry-run policy evaluation.
 */

import type { GatecoClient } from "../client.js";
import type { SimulationResult } from "../types/simulator.js";
import { parseSimulationResult } from "../types/simulator.js";

/** Options for running a dry-run simulation. */
export interface RunSimulationOptions {
  principalId: string;
  query?: string;
  connectorId?: string;
  resourceIds?: string[];
}

/** Options for running a live preview. */
export interface RunPreviewOptions {
  principalId: string;
  connectorId: string;
  query: string;
  topK?: number;
  searchMode?: "vector" | "keyword" | "hybrid";
  alpha?: number;
}

/** Options for running a batch live preview (up to 5 principals). */
export interface RunBatchPreviewOptions {
  principalIds: string[];
  connectorId: string;
  query: string;
  topK?: number;
  searchMode?: "vector" | "keyword" | "hybrid";
  alpha?: number;
}

/** Namespace for access simulator endpoints. Accessed as `client.simulator`. */
export class SimulatorResource {
  constructor(private readonly client: GatecoClient) {}

  /** Run a dry-run policy simulation for a principal against resources. */
  async run(options: RunSimulationOptions): Promise<SimulationResult> {
    const body: Record<string, unknown> = {
      principal_id: options.principalId,
    };
    if (options.query !== undefined) body["query"] = options.query;
    if (options.connectorId !== undefined) body["connector_id"] = options.connectorId;
    if (options.resourceIds !== undefined) body["resource_ids"] = options.resourceIds;

    const data = await this.client._request("POST", "/api/simulator/run", { json: body });
    return parseSimulationResult(data as Record<string, unknown>);
  }

  /**
   * Execute a live preview — real search + policy evaluation for a single principal (Pro+ only).
   *
   * Denied results contain metadata and denial reasons but no content.
   * `topK` is capped at 20 server-side.
   */
  async runPreview(options: RunPreviewOptions): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = {
      principal_id: options.principalId,
      connector_id: options.connectorId,
      query: options.query,
    };
    if (options.topK !== undefined) body["top_k"] = options.topK;
    if (options.searchMode !== undefined) body["search_mode"] = options.searchMode;
    if (options.alpha !== undefined) body["alpha"] = options.alpha;

    const data = await this.client._request("POST", "/api/simulator/preview", { json: body });
    return (data as Record<string, unknown>) ?? {};
  }

  /**
   * Execute a batch live preview — one search, policy evaluation for up to 5 principals (Pro+ only).
   *
   * Returns a result matrix: per-principal allowed/denied breakdowns for the same query.
   */
  async runBatchPreview(options: RunBatchPreviewOptions): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = {
      principal_ids: options.principalIds,
      connector_id: options.connectorId,
      query: options.query,
    };
    if (options.topK !== undefined) body["top_k"] = options.topK;
    if (options.searchMode !== undefined) body["search_mode"] = options.searchMode;
    if (options.alpha !== undefined) body["alpha"] = options.alpha;

    const data = await this.client._request("POST", "/api/simulator/preview-batch", { json: body });
    return (data as Record<string, unknown>) ?? {};
  }
}
