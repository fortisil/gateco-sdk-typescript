/**
 * Types for REBAC relationship management endpoints.
 */

/** A direct REBAC relationship between a principal (subject) and a resource (object). */
export interface Relationship {
  id: string;
  organization_id: string;
  subject_principal_id: string;
  relation_name: string;
  object_resource_id: string;
  created_by_user_id: string | null;
  created_at: string;
}

/** Request body for creating a new relationship. */
export interface CreateRelationshipRequest {
  subject_principal_id: string;
  relation_name: string;
  object_resource_id: string;
}
