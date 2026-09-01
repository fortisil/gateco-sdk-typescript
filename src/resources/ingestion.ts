/**
 * Ingestion resource -- document and batch ingestion.
 */

import type { GatecoClient } from "../client.js";
import { IngestionJobsResource } from "./ingestionJobs.js";
import type { IngestDocumentResponse, BatchIngestResponse } from "../types/ingestion.js";
import type { IngestFileResponse, BatchFileIngestResponse } from "../types/ingestion.js";
import { parseIngestFileResponse, parseBatchFileIngestResponse } from "../types/ingestion.js";
import { parseIngestDocumentResponse, parseBatchIngestResponse } from "../types/ingestion.js";

/**
 * Per-request chunking override. Applies to one request only; the
 * connector's pinned chunking configuration is unchanged.
 */
export interface ChunkingOverride {
  strategy: "characters" | "tokens" | "recursive" | "markdown";
  chunk_size?: number;
  chunk_overlap?: number;
}

/**
 * Per-request embedding provider override. No api_key field by design:
 * keys resolve server-side from provider env vars, or the request targets
 * a customer-hosted keyless endpoint (openai_compatible).
 */
export interface EmbeddingOverride {
  provider: "openai" | "openai_compatible" | "cohere" | "voyage";
  model?: string;
  dimensions?: number;
  base_url?: string;
}

/** Options for single document ingestion. */
export interface IngestDocumentOptions {
  classification?: string;
  sensitivity?: string;
  domain?: string;
  labels?: string[];
  metadata?: Record<string, unknown>;
  ownerPrincipalId?: string;
  idempotencyKey?: string;
  chunking?: ChunkingOverride;
  embedding?: EmbeddingOverride;
}

/** Namespace for ingestion endpoints. Accessed as `client.ingest`. */
/** Options for `ingest.file()` (mirrors the Python SDK's form fields). */
export interface IngestFileOptions {
  externalResourceId?: string;
  classification?: string;
  sensitivity?: string;
  domain?: string;
  labels?: string[];
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

/** One file in an `ingest.files()` batch. */
export interface FileUpload {
  file: Blob;
  filename: string;
}

/** Options for `ingest.files()` (applied to every file in the batch). */
export interface IngestFilesOptions {
  domain?: string;
  classification?: string;
  sensitivity?: string;
  labels?: string[];
}

export class IngestionResource {
  /** Async ingestion jobs (Team plan and above). */
  readonly jobs: IngestionJobsResource;

  constructor(private readonly client: GatecoClient) {
    this.jobs = new IngestionJobsResource(client);
  }

  /**
   * Ingest a single document.
   *
   * Requires a Tier 1 connector (pgvector, supabase, neon, pinecone, qdrant).
   *
   * @param connectorId - Target connector (must be Tier 1).
   * @param externalResourceId - Caller-defined resource identifier.
   * @param text - Document text to embed and store.
   * @param options - Optional classification, sensitivity, labels, metadata, etc.
   */
  async document(
    connectorId: string,
    externalResourceId: string,
    text: string,
    options: IngestDocumentOptions = {},
  ): Promise<IngestDocumentResponse> {
    const body: Record<string, unknown> = {
      connector_id: connectorId,
      external_resource_id: externalResourceId,
      text,
    };
    if (options.classification !== undefined) body["classification"] = options.classification;
    if (options.sensitivity !== undefined) body["sensitivity"] = options.sensitivity;
    if (options.domain !== undefined) body["domain"] = options.domain;
    if (options.labels !== undefined) body["labels"] = options.labels;
    if (options.metadata !== undefined) body["metadata"] = options.metadata;
    if (options.ownerPrincipalId !== undefined) body["owner_principal_id"] = options.ownerPrincipalId;
    if (options.idempotencyKey !== undefined) body["idempotency_key"] = options.idempotencyKey;
    if (options.chunking !== undefined) body["chunking"] = options.chunking;
    if (options.embedding !== undefined) body["embedding"] = options.embedding;

    const data = await this.client._request("POST", "/api/v1/ingest", { json: body });
    return parseIngestDocumentResponse(data as Record<string, unknown>);
  }

  /**
   * Ingest a batch of documents in a single request.
   *
   * Requires a Tier 1 connector (pgvector, supabase, neon, pinecone, qdrant)
   * and the `batch_ingestion` feature (Team plan and above); free-plan orgs
   * receive an EntitlementError with `reason="feature_not_in_plan"`.
   *
   * @param connectorId - Target connector (must be Tier 1).
   * @param records - List of record objects, each containing at minimum
   *   `external_resource_id` and `text`.
   * @param idempotencyKey - Optional idempotency key for safe retries.
   */
  async batch(
    connectorId: string,
    records: Record<string, unknown>[],
    idempotencyKey?: string,
    options: { chunking?: ChunkingOverride; embedding?: EmbeddingOverride } = {},
  ): Promise<BatchIngestResponse> {
    const body: Record<string, unknown> = {
      connector_id: connectorId,
      records,
    };
    if (idempotencyKey !== undefined) {
      body["idempotency_key"] = idempotencyKey;
    }
    if (options.chunking !== undefined) body["chunking"] = options.chunking;
    if (options.embedding !== undefined) body["embedding"] = options.embedding;

    const data = await this.client._request("POST", "/api/v1/ingest/batch", { json: body });
    return parseBatchIngestResponse(data as Record<string, unknown>);
  }

  /** Tombstone an ingested resource: vectors + registry + soft delete. */
  async deleteResource(
    connectorId: string,
    externalResourceId: string,
  ): Promise<Record<string, unknown>> {
    return (await this.client._request(
      "DELETE",
      `/api/v1/ingest/resources/${encodeURIComponent(externalResourceId)}?connector_id=${connectorId}`,
    )) as Record<string, unknown>;
  }

  /**
   * Upload one file for extraction, chunking, embedding and registration
   * (`POST /api/v1/ingest/file`, multipart). Works with a `Blob`/`File` in
   * browsers and Node 18+.
   */
  async file(
    connectorId: string,
    file: Blob,
    filename: string,
    options: IngestFileOptions = {},
  ): Promise<IngestFileResponse> {
    const form = new FormData();
    form.append("connector_id", connectorId);
    if (options.externalResourceId !== undefined) form.append("external_resource_id", options.externalResourceId);
    if (options.classification !== undefined) form.append("classification", options.classification);
    if (options.sensitivity !== undefined) form.append("sensitivity", options.sensitivity);
    if (options.domain !== undefined) form.append("domain", options.domain);
    if (options.labels !== undefined) form.append("labels", options.labels.join(","));
    if (options.metadata !== undefined) form.append("metadata_json", JSON.stringify(options.metadata));
    if (options.idempotencyKey !== undefined) form.append("idempotency_key", options.idempotencyKey);
    form.append("file", file, filename);
    const data = await this.client._request("POST", "/api/v1/ingest/file", { formData: form });
    return parseIngestFileResponse(data ?? {});
  }

  /**
   * Upload several files in one request (`POST /api/v1/ingest/files`,
   * multipart, Team+ like the JSON batch endpoint).
   */
  async files(
    connectorId: string,
    uploads: FileUpload[],
    options: IngestFilesOptions = {},
  ): Promise<BatchFileIngestResponse> {
    const form = new FormData();
    form.append("connector_id", connectorId);
    if (options.domain !== undefined) form.append("domain", options.domain);
    if (options.classification !== undefined) form.append("classification", options.classification);
    if (options.sensitivity !== undefined) form.append("sensitivity", options.sensitivity);
    if (options.labels !== undefined) form.append("labels", options.labels.join(","));
    for (const u of uploads) form.append("files", u.file, u.filename);
    const data = await this.client._request("POST", "/api/v1/ingest/files", { formData: form });
    return parseBatchFileIngestResponse(data ?? {});
  }
}
