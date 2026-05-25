/**
 * Types for authentication endpoints.
 */

/** Organization summary embedded in user responses. */
export interface Organization {
  id: string;
  name: string;
  slug?: string;
}

/** Authenticated user profile. */
export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  organization_id?: string;
  organization?: Organization;
  created_at?: string;
  updated_at?: string;
}

/** Request body for `POST /api/auth/login`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Request body for `POST /api/auth/signup`. */
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  organization_name: string;
}

/** Token pair returned from login / signup / refresh. */
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

/** Full response from login and signup (backend LoginResponse). */
export interface LoginResponse {
  user: User;
  tokens: TokenResponse;
}

/**
 * Parse a raw JSON object into a TokenResponse.
 * Handles both the flat shape ({access_token, ...}) returned by /refresh
 * and the nested shape ({user, tokens: {access_token, ...}}) from /login and /signup.
 */
export function parseTokenResponse(data: Record<string, unknown>): TokenResponse {
  // Nested shape: {user, tokens: {...}}
  if (data["tokens"] && typeof data["tokens"] === "object") {
    const t = data["tokens"] as Record<string, unknown>;
    return {
      access_token: t["access_token"] as string,
      refresh_token: t["refresh_token"] as string | undefined,
      token_type: (t["token_type"] as string) ?? "bearer",
      expires_in: t["expires_in"] as number | undefined,
    };
  }
  // Flat shape: {access_token, refresh_token, ...}
  return {
    access_token: data["access_token"] as string,
    refresh_token: data["refresh_token"] as string | undefined,
    token_type: (data["token_type"] as string) ?? "bearer",
    expires_in: data["expires_in"] as number | undefined,
  };
}

/** Parse a LoginResponse (login/signup) including the embedded user. */
export function parseLoginResponse(data: Record<string, unknown>): LoginResponse {
  const user = parseUser((data["user"] ?? data) as Record<string, unknown>);
  const tokens = parseTokenResponse(data);
  return { user, tokens };
}

/** Parse a raw JSON object into a User. */
export function parseUser(data: Record<string, unknown>): User {
  return {
    id: data["id"] as string,
    name: data["name"] as string,
    email: data["email"] as string,
    role: data["role"] as string | undefined,
    organization_id: data["organization_id"] as string | undefined,
    organization: data["organization"]
      ? parseOrganization(data["organization"] as Record<string, unknown>)
      : undefined,
    created_at: data["created_at"] as string | undefined,
    updated_at: data["updated_at"] as string | undefined,
  };
}

/** Parse a raw JSON object into an Organization. */
export function parseOrganization(data: Record<string, unknown>): Organization {
  return {
    id: data["id"] as string,
    name: data["name"] as string,
    slug: data["slug"] as string | undefined,
  };
}
