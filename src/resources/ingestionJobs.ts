/**
 * Async ingestion jobs (Team plan and above). Accessed as `client.ingest.jobs`.
 */

import type { GatecoClient } from "../client.js";

export interface IngestionJobView {
  id: string;
  connector_id: string;
  job_type: string;
  status: string;
  progress: { total: number; done: number; failed: number };
  attempts: number;
  max_attempts: number;
  result: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

const TERMINAL = new Set(["completed", "partial", "failed", "dead_letter", "cancelled"]);

export class IngestionJobsResource {
  constructor(private readonly client: GatecoClient) {}

  /** Enqueue an async ingestion job (202). jobType: "document" | "batch". */
  async enqueue(
    connectorId: string,
    jobType: "document" | "batch",
    payload: Record<string, unknown>,
    maxAttempts = 3,
  ): Promise<IngestionJobView> {
    const data = await this.client._request("POST", "/api/v1/ingest/jobs", {
      json: {
        connector_id: connectorId,
        job_type: jobType,
        payload,
        max_attempts: maxAttempts,
      },
    });
    return data as unknown as IngestionJobView;
  }

  async get(jobId: string): Promise<IngestionJobView> {
    return (await this.client._request("GET", `/api/v1/ingest/jobs/${jobId}`)) as unknown as IngestionJobView;
  }

  async list(options: { status?: string; limit?: number; offset?: number } = {}): Promise<{
    data: IngestionJobView[];
    meta: { total: number; limit: number; offset: number };
  }> {
    const params = new URLSearchParams();
    if (options.status) params.set("status", options.status);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.offset !== undefined) params.set("offset", String(options.offset));
    const qs = params.toString();
    const path = qs ? `/api/v1/ingest/jobs?${qs}` : "/api/v1/ingest/jobs";
    return (await this.client._request("GET", path)) as unknown as {
      data: IngestionJobView[];
      meta: { total: number; limit: number; offset: number };
    };
  }

  /** Cancel a queued job (running jobs are not cancellable). */
  async cancel(jobId: string): Promise<IngestionJobView> {
    return (await this.client._request(
      "POST",
      `/api/v1/ingest/jobs/${jobId}/cancel`,
    )) as unknown as IngestionJobView;
  }

  /** Poll until the job reaches a terminal status. */
  async waitFor(jobId: string, pollMs = 2000, timeoutMs = 600000): Promise<IngestionJobView> {
    const start = Date.now();
    for (;;) {
      const job = await this.get(jobId);
      if (TERMINAL.has(job.status)) return job;
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Ingestion job ${jobId} did not finish within ${timeoutMs}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }
}
