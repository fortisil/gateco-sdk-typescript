/**
 * Users resource -- current user profile (GET /me, PATCH /me) and organization settings.
 */

import type { GatecoClient } from "../client.js";
import type { User } from "../types/auth.js";
import { parseUser } from "../types/auth.js";

/** Organization settings returned by `GET /api/organization/settings`. */
export interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  plan: string;
  failure_mode: string;
  llm_provider: string;
  llm_api_key_configured: boolean;
  llm_fallback_credits_used?: number;
  llm_fallback_credits_limit?: number;
  llm_key_uses?: number;
  llm_key_query_cap?: number | null;
  llm_fallback_available?: boolean;
}

/** Fields that can be updated via `PATCH /api/organization/settings`. */
export interface UpdateOrgSettingsRequest {
  name?: string;
  failure_mode?: string;
  llm_api_key?: string;
  llm_provider?: string;
  clear_llm_api_key?: boolean;
  llm_key_query_cap?: number | null;
}

/** Namespace for user profile endpoints. Accessed as `client.users`. */
export class UsersResource {
  constructor(private readonly client: GatecoClient) {}

  /**
   * Get the current authenticated user with organization plan for entitlement gating.
   */
  async getMe(): Promise<User> {
    const data = await this.client._request("GET", "/api/users/me");
    return parseUser(data as Record<string, unknown>);
  }

  /**
   * Update the current user's profile.
   *
   * @param name  New display name (required).
   */
  async updateMe(name: string): Promise<User> {
    const data = await this.client._request("PATCH", "/api/users/me", {
      json: { name },
    });
    return parseUser(data as Record<string, unknown>);
  }

  // ------------------------------------------------------------------
  // Organization settings
  // ------------------------------------------------------------------

  /**
   * Get organization-level settings.
   *
   * Returns configuration status for features that require per-org setup
   * (e.g. whether an LLM API key is configured for answer synthesis).
   */
  async getOrgSettings(): Promise<OrgSettings> {
    const data = await this.client._request("GET", "/api/organization/settings");
    return data as unknown as OrgSettings;
  }

  /**
   * Update organization settings.
   *
   * @param opts  Fields to update (all optional).
   */
  async updateOrgSettings(opts: UpdateOrgSettingsRequest): Promise<OrgSettings> {
    const data = await this.client._request(
      "PATCH",
      "/api/organization/settings",
      { json: opts as Record<string, unknown> },
    );
    return data as unknown as OrgSettings;
  }
}
