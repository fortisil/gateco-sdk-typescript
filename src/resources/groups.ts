/**
 * Groups resource -- read-only directory of IdP-synced groups.
 */

import type { GatecoClient } from "../client.js";
import type { Page } from "../pagination.js";
import { parsePage, listAll } from "../pagination.js";
import type { PrincipalGroup } from "../types/groups.js";
import { parsePrincipalGroup } from "../types/groups.js";

/** Optional filters for listing groups. */
export interface ListGroupsOptions {
  /** Case-insensitive substring filter on group name. */
  search?: string;
}

/** Namespace for group endpoints. Accessed as `client.groups`. */
export class GroupsResource {
  constructor(private readonly client: GatecoClient) {}

  /**
   * Fetch a single page of groups.
   *
   * `member_count` on each group is computed live by the server from
   * active principals' group memberships.
   */
  async list(
    page = 1,
    perPage = 20,
    options?: ListGroupsOptions,
  ): Promise<Page<PrincipalGroup>> {
    const params: Record<string, string | number | boolean | undefined> = {
      page,
      per_page: perPage,
      search: options?.search,
    };
    const raw = await this.client._request("GET", "/api/groups", { params });
    return parsePage(raw, page, perPage, parsePrincipalGroup);
  }

  /** Return an async generator that lazily paginates through all groups. */
  listAll(
    perPage = 100,
    options?: ListGroupsOptions,
  ): AsyncGenerator<PrincipalGroup, void, undefined> {
    return listAll(
      async (page, pp) =>
        (await this.client._request("GET", "/api/groups", {
          params: { page, per_page: pp, search: options?.search },
        })) ?? {},
      parsePrincipalGroup,
      perPage,
    );
  }
}
