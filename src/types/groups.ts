/**
 * Types for group endpoints.
 */

/**
 * A group synced or pushed from an identity provider.
 *
 * `member_count` is computed live by the server from active principals'
 * group memberships; it is not the denormalized stored counter.
 */
export interface PrincipalGroup {
  id: string;
  name?: string;
  identity_provider_id?: string;
  identity_provider_name?: string;
  external_id?: string;
  member_count: number;
  created_at?: string;
  updated_at?: string;
}

/** Parse a raw JSON object into a PrincipalGroup. */
export function parsePrincipalGroup(
  data: Record<string, unknown>,
): PrincipalGroup {
  return {
    id: data["id"] as string,
    name: data["name"] as string | undefined,
    identity_provider_id: data["identity_provider_id"] as string | undefined,
    identity_provider_name: data["identity_provider_name"] as
      | string
      | undefined,
    external_id: data["external_id"] as string | undefined,
    member_count: (data["member_count"] as number) ?? 0,
    created_at: data["created_at"] as string | undefined,
    updated_at: data["updated_at"] as string | undefined,
  };
}
