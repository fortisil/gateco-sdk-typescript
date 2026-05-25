/**
 * Users resource -- current user profile (GET /me, PATCH /me).
 */

import type { GatecoClient } from "../client.js";
import type { User } from "../types/auth.js";
import { parseUser } from "../types/auth.js";

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
}
