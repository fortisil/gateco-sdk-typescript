/**
 * API keys resource -- create, list, delete, rotate.
 */

import type { GatecoClient } from "../client.js";
import type { ApiKey, CreateApiKeyResponse } from "../types/api-keys.js";

/** Parameters for creating a new API key. */
export interface CreateApiKeyParams {
  /** Human-readable label for the key. */
  name: string;
  /** Optional ISO 8601 expiry date. If omitted the key does not expire. */
  expires_at?: string;
}

/** Namespace for API key management endpoints. Accessed as `client.apiKeys`. */
export class ApiKeysResource {
  constructor(private readonly client: GatecoClient) {}

  /**
   * Create a new API key for the authenticated organization.
   *
   * The plaintext `key` field in the response is shown exactly once and is
   * never stored -- copy it immediately.
   */
  async create(params: CreateApiKeyParams): Promise<CreateApiKeyResponse> {
    const body: Record<string, unknown> = { name: params.name };
    if (params.expires_at !== undefined) body["expires_at"] = params.expires_at;
    const data = await this.client._request("POST", "/api/api-keys", { json: body });
    return parseCreateApiKeyResponse(data as Record<string, unknown>);
  }

  /**
   * List all API keys for the authenticated organization.
   *
   * Plaintext key values are never returned in list responses.
   */
  async list(): Promise<{ data: ApiKey[] }> {
    const raw = await this.client._request("GET", "/api/api-keys");
    const items = Array.isArray((raw as Record<string, unknown>)["data"])
      ? ((raw as Record<string, unknown>)["data"] as Record<string, unknown>[]).map(parseApiKey)
      : [];
    return { data: items };
  }

  /**
   * Delete an API key by ID. The key is immediately revoked.
   */
  async delete(keyId: string): Promise<void> {
    await this.client._request("DELETE", `/api/api-keys/${keyId}`);
  }

  /**
   * Rotate an existing API key.
   *
   * The old key is immediately revoked. Returns a new key record including
   * the plaintext `key` field, shown exactly once.
   */
  async rotate(keyId: string): Promise<CreateApiKeyResponse> {
    const data = await this.client._request("POST", `/api/api-keys/${keyId}/rotate`);
    return parseCreateApiKeyResponse(data as Record<string, unknown>);
  }
}

/** Parse a raw JSON object into an ApiKey. */
function parseApiKey(data: Record<string, unknown>): ApiKey {
  return {
    id: data["id"] as string,
    name: data["name"] as string,
    prefix: data["prefix"] as string,
    last_used_at: (data["last_used_at"] as string | null) ?? null,
    expires_at: (data["expires_at"] as string | null) ?? null,
    created_at: data["created_at"] as string,
  };
}

/** Parse a raw JSON object into a CreateApiKeyResponse (includes plaintext key). */
function parseCreateApiKeyResponse(data: Record<string, unknown>): CreateApiKeyResponse {
  return {
    ...parseApiKey(data),
    key: data["key"] as string,
  };
}
