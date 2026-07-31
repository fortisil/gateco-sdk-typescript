/**
 * Source connections (Growth plan and above). Accessed as `client.sources`.
 * Document sources with permission import: gdrive, sharepoint, confluence,
 * notion (plus a stub for testing).
 */

import type { GatecoClient } from "../client.js";

export interface SourceConnectionView {
  id: string;
  name: string;
  source_type: string;
  config: Record<string, unknown>;
  delta_cursor: string | null;
  last_synced_at: string | null;
  created_at: string | null;
}

export interface AclCoverageView {
  total_entries: number;
  matched_users: number;
  unmatched_users: number;
  unmatched_user_emails: string[];
  group_entries: number;
  open_access_entries: number;
}

export class SourceConnectionsResource {
  constructor(private readonly client: GatecoClient) {}

  async create(
    name: string,
    sourceType: string,
    config: Record<string, unknown>,
  ): Promise<SourceConnectionView> {
    return (await this.client._request("POST", "/api/source-connections", {
      json: { name, source_type: sourceType, config },
    })) as unknown as SourceConnectionView;
  }

  async list(): Promise<SourceConnectionView[]> {
    const data = (await this.client._request("GET", "/api/source-connections")) as unknown as {
      data: SourceConnectionView[];
    };
    return data.data;
  }

  async get(id: string): Promise<SourceConnectionView> {
    return (await this.client._request("GET", `/api/source-connections/${id}`)) as unknown as SourceConnectionView;
  }

  async delete(id: string): Promise<void> {
    await this.client._request("DELETE", `/api/source-connections/${id}`);
  }

  async test(id: string): Promise<{ ok: boolean; message: string }> {
    return (await this.client._request("POST", `/api/source-connections/${id}/test`)) as unknown as {
      ok: boolean;
      message: string;
    };
  }

  /** Coverage report: matched/unmatched principals in imported ACLs. */
  async aclCoverage(id: string): Promise<AclCoverageView> {
    return (await this.client._request(
      "GET",
      `/api/source-connections/${id}/acl-coverage`,
    )) as unknown as AclCoverageView;
  }
}
