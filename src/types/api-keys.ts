/**
 * Types for API key management endpoints.
 */

/** A stored API key record (plaintext is never returned after creation). */
export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

/** Response from POST /api/api-keys or POST /api/api-keys/{id}/rotate. */
export interface CreateApiKeyResponse extends ApiKey {
  /** Plaintext key value -- shown exactly once, never stored. */
  key: string;
}
