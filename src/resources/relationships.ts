/**
 * Relationships resource -- create, list, and delete REBAC relationships.
 */

import type { GatecoClient } from "../client.js";
import type { Relationship, CreateRelationshipRequest } from "../types/relationships.js";

/** Query parameters for listing relationships. */
export interface ListRelationshipsParams {
  /** Filter by subject principal ID. */
  subject_id?: string;
  /** Filter by relation name. */
  relation?: string;
  /** Filter by object resource ID. */
  object_id?: string;
}

/** Namespace for REBAC relationship management endpoints. Accessed as `client.relationships`. */
export class RelationshipsResource {
  constructor(private readonly client: GatecoClient) {}

  /**
   * Create a new direct REBAC relationship between a principal and a resource.
   */
  async create(req: CreateRelationshipRequest): Promise<Relationship> {
    const body: Record<string, unknown> = {
      subject_principal_id: req.subject_principal_id,
      relation_name: req.relation_name,
      object_resource_id: req.object_resource_id,
    };
    const data = await this.client._request("POST", "/api/relationships", { json: body });
    return parseRelationship(data as Record<string, unknown>);
  }

  /**
   * List REBAC relationships for the authenticated organization.
   *
   * Optionally filter by subject principal ID, relation name, or object resource ID.
   */
  async list(params?: ListRelationshipsParams): Promise<Relationship[]> {
    const queryParams: Record<string, string | number | boolean | undefined> = {};
    if (params?.subject_id !== undefined) queryParams["subject_id"] = params.subject_id;
    if (params?.relation !== undefined) queryParams["relation"] = params.relation;
    if (params?.object_id !== undefined) queryParams["object_id"] = params.object_id;

    const raw = await this.client._request("GET", "/api/relationships", {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });
    const items = Array.isArray((raw as Record<string, unknown>)["data"])
      ? ((raw as Record<string, unknown>)["data"] as Record<string, unknown>[]).map(
          parseRelationship,
        )
      : [];
    return items;
  }

  /**
   * Delete a relationship by ID. The relationship is immediately removed.
   */
  async delete(relationshipId: string): Promise<void> {
    await this.client._request("DELETE", `/api/relationships/${relationshipId}`);
  }
}

/** Parse a raw JSON object into a Relationship. */
function parseRelationship(data: Record<string, unknown>): Relationship {
  return {
    id: data["id"] as string,
    organization_id: data["organization_id"] as string,
    subject_principal_id: data["subject_principal_id"] as string,
    relation_name: data["relation_name"] as string,
    object_resource_id: data["object_resource_id"] as string,
    created_by_user_id: (data["created_by_user_id"] as string | null) ?? null,
    created_at: data["created_at"] as string,
  };
}
