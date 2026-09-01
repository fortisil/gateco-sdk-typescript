/**
 * Principals resource -- list + detail.
 */

import type { GatecoClient } from "../client.js";
import type { Page } from "../pagination.js";
import { parsePage, listAll } from "../pagination.js";
import type { Principal } from "../types/principals.js";
import { parsePrincipal } from "../types/principals.js";

/** Optional filters for listing principals. */
export interface ListPrincipalsOptions {
  /**
   * Status filter: "active", "inactive", "suspended", or "all".
   * Omitted = active only (the legacy default).
   */
  status?: "active" | "inactive" | "suspended" | "all";
  /** Case-insensitive substring filter on display name or email. */
  search?: string;
  /** Exact group name the principal is a member of. */
  group?: string;
}

function principalParams(
  page: number,
  perPage: number,
  options?: ListPrincipalsOptions,
): Record<string, string | number | boolean | undefined> {
  return {
    page,
    per_page: perPage,
    status: options?.status,
    search: options?.search,
    group: options?.group,
  };
}

/** Namespace for principal endpoints. Accessed as `client.principals`. */
export class PrincipalsResource {
  constructor(private readonly client: GatecoClient) {}

  // ------------------------------------------------------------------
  // List
  // ------------------------------------------------------------------

  /** Fetch a single page of principals. */
  async list(
    page = 1,
    perPage = 20,
    options?: ListPrincipalsOptions,
  ): Promise<Page<Principal>> {
    const raw = await this.client._request("GET", "/api/principals", {
      params: principalParams(page, perPage, options),
    });
    return parsePage(raw, page, perPage, parsePrincipal);
  }

  /** Return an async generator that lazily paginates through all principals. */
  listAll(
    perPage = 100,
    options?: ListPrincipalsOptions,
  ): AsyncGenerator<Principal, void, undefined> {
    return listAll(
      async (page, pp) =>
        (await this.client._request("GET", "/api/principals", {
          params: principalParams(page, pp, options),
        })) ?? {},
      parsePrincipal,
      perPage,
    );
  }

  // ------------------------------------------------------------------
  // Detail
  // ------------------------------------------------------------------

  /** Get a single principal by ID. */
  async get(principalId: string): Promise<Principal> {
    const data = await this.client._request("GET", `/api/principals/${principalId}`);
    return parsePrincipal(data as Record<string, unknown>);
  }

  // ------------------------------------------------------------------
  // Local directory (create / update / delete)
  // ------------------------------------------------------------------

  /**
   * Create a principal in the organisation's built-in local directory.
   *
   * Available on every plan, bounded by the plan's `principals` limit
   * (Free 10 / Team 100 / Growth+ unlimited). The local directory is
   * provisioned automatically on first use and never syncs.
   *
   * @throws {ConflictError} An active principal with this email already exists.
   * @throws {EntitlementError} The plan's principal limit is reached (`isLimit`).
   */
  async create(params: {
    email: string;
    display_name?: string;
    groups?: string[];
    roles?: string[];
    attributes?: Record<string, unknown>;
    provider_subject?: string;
  }): Promise<Principal> {
    const data = await this.client._request("POST", "/api/principals", {
      json: params,
    });
    return parsePrincipal(data as Record<string, unknown>);
  }

  /** Update a local principal. Synced principals are rejected with 422. */
  async update(
    principalId: string,
    params: {
      display_name?: string;
      groups?: string[];
      roles?: string[];
      attributes?: Record<string, unknown>;
      status?: "active" | "inactive" | "suspended";
    },
  ): Promise<Principal> {
    const data = await this.client._request(
      "PATCH",
      `/api/principals/${principalId}`,
      { json: params },
    );
    return parsePrincipal(data as Record<string, unknown>);
  }

  /** Deactivate a local principal (status -> inactive). Never a hard delete. */
  async delete(principalId: string): Promise<void> {
    await this.client._request("DELETE", `/api/principals/${principalId}`);
  }

  // ------------------------------------------------------------------
  // Resolve
  // ------------------------------------------------------------------

  /**
   * Resolve a principal by email or provider subject ID.
   *
   * At least one of `email` or `provider_subject` must be provided.
   * `identity_provider_id` optionally scopes the lookup to a single
   * identity provider.
   *
   * @throws {GatecoError} When neither email nor provider_subject is provided.
   * @throws {NotFoundError} When no matching principal is found.
   */
  async resolve(params: {
    email?: string;
    provider_subject?: string;
    identity_provider_id?: string;
  }): Promise<Principal> {
    if (!params.email && !params.provider_subject) {
      throw new Error(
        "At least one of 'email' or 'provider_subject' must be provided.",
      );
    }
    const data = await this.client._request("POST", "/api/principals/resolve", {
      json: params as Record<string, unknown>,
    });
    return parsePrincipal(data as Record<string, unknown>);
  }
}
