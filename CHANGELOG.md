# Changelog

## [1.9.0] - 2026-09-01

### Changed (breaking for two call patterns; see below)
- **Default base URL is now `https://api.gateco.ai`**, overridable with the `GATECO_BASE_URL`
  environment variable. It used to be `http://localhost:8000`, which made every documented
  snippet fail for anyone outside the repository. Local development sets
  `GATECO_BASE_URL=http://localhost:8000`.
- **`apiKeys.create()` now requires `scopes`** (`create({ name, scopes })`). Calling it without scopes returns HTTP 422 from the
  server. Scopes: `ingest`, `relationships`, `retrieve`, `principals`. Existing stored keys were
  migrated to `ingest` + `relationships`, exactly their previous reach; `retrieve` is always an
  explicit opt-in.

### Added
- API keys work on the retrieval path. A key with the `retrieve` scope can call
  `retrievals.execute` / `filter`, `answers.execute`, `principals.resolve` / `list` / `get` and
  `connectors.list` (minimal shape). This is the machine credential a RAG service or MCP host
  should use; `login()` is for the console and account management. Keys are available on every
  plan (limit: Free 2 / Team 10 / Growth 25 / Enterprise unlimited).
- Local principals: `principals.create()` / `update()` / `delete()` manage users in the org's built-in
  local directory without an identity provider (Free 10 / Team 100 / Growth+ unlimited).
  `Principal.identity_provider_type` is `"local"` for these.
- `users.getMe()` returns an `auth` block (`kind`, `key_id`, `key_name`, `scopes`) describing how
  the call authenticated.
- MCP: the authentication error now says a key needs the `retrieve` scope, and a scope-missing 403
  is reported as such. `server.json` describes the required scope. MCP works on every plan.

### Fixed
- A 401 from a JWT-only endpoint when an API key was supplied now reads
  `AUTH_JWT_REQUIRED: This endpoint requires a user session; API keys are not accepted here`
  instead of `Missing authentication token`.
- API key `last_used_at` is persisted on read-only calls (it stayed `Never` after real use).
- Rotating a key preserves its scopes.

## [1.8.0] - 2026-07-31

### Added
- Async ingestion jobs (Team plan and above): `client.ingest.jobs` (`enqueue/get/list/cancel/waitFor`).
- Resource tombstones: `client.ingest.deleteResource()` removes an ingested resource's vectors,
  registry chunks, and gated resource.
- Source connections (Growth plan and above): `client.sources` for Google Drive, SharePoint,
  Confluence and Notion, with `aclCoverage()`, plus `PlanFeatures.async_ingestion` and
  `PlanFeatures.source_connectors`.

(This entry and 1.7.0 were missing from this changelog at release time and were added on
2026-09-01; the Python changelog carried them.)

## [1.7.0] - 2026-07-31

### Added
- `chunking` override on ingest document/batch (`characters`, `tokens`, `recursive`, `markdown`).
- `embedding` override on ingest document/batch (`openai`, `openai_compatible`, `cohere`, `voyage`);
  requests never carry API keys.

[1.6.0] - 2026-07-31

### Added
- `PlanLimits.ingested_documents` and `PlanFeatures.batch_ingestion` typed fields, matching the new
  backend plan catalog keys (monthly ingested-document limits: free 100 / team 10k / growth 100k /
  enterprise unlimited).
- Docs: `client.ingest.batch()` requires the `batch_ingestion` feature (Team plan and above);
  free-plan orgs receive `EntitlementError` with `reason="feature_not_in_plan"`.

### Changed
- Server-side (no client code change needed): all ingestion endpoints now accept `X-API-Key`
  authentication in addition to JWT, batch ingestion coalesces embedding calls (large batches are
  significantly faster), and re-ingesting a document that produces fewer chunks now prunes the stale
  chunks from both the registry and the vector DB.

## [1.5.1] - 2026-07-28

No functional changes. Released to verify the switch to Trusted Publishing (OIDC) — this version was
published with no stored npm token. Identical in behaviour to 1.5.0.

## [1.5.0] - 2026-07-28

### Added
- `EntitlementError.reason` — distinguishes the two conditions that share a 403 `ENTITLEMENT_REQUIRED`:
  `"feature_not_in_plan"` (the plan does not grant the feature) and `"resource_limit_reached"` (the plan
  grants it, but the org's quota is full). Both carry `upgradeTo`, so previously they were
  indistinguishable without parsing the message string.
- `EntitlementError.isLimit` / `EntitlementError.isFeatureGate` getters, plus the
  `EntitlementError.REASON_FEATURE` / `REASON_LIMIT` constants. When `reason` is absent (older backend),
  both report a feature gate, preserving pre-1.5.0 behaviour.

### Requires
- Backend with `error.reason` on entitlement responses (2026-07-28 or later). Against older backends the
  SDK degrades gracefully: `reason` is `undefined` and `isFeatureGate` is `true`.

## [1.4.0] - 2026-05-26

### Added
- `UsersResource` and `RelationshipsResource` now exported from the root `@gateco/sdk` entry point (were accessible via sub-paths only)
- `OrgSettings`, `UpdateOrgSettingsRequest`, and `ListRelationshipsParams` types re-exported from root entry point

## [1.3.0] - 2026-05-26

### Added
- `OrgSettings` gains five new optional fields: `llm_fallback_credits_used`, `llm_fallback_credits_limit`, `llm_key_uses`, `llm_key_query_cap`, `llm_fallback_available`
- `UpdateOrgSettingsRequest` gains `clear_llm_api_key?: boolean` and `llm_key_query_cap?: number | null`
- `LlmCreditExhaustedError` — raised when the org's 100 paid-tier fallback synthesis credits are exhausted
- `LlmKeyNotConfiguredError` — raised when answer synthesis is attempted on the free tier without a configured API key; both exported from top-level `@gateco/sdk`
- `AnswerResponse.cap_reached?: boolean` — set when the latest response has hit the admin-configured query cap

### Fixed
- `errorFromResponse()` now correctly parses FastAPI's `{"detail": {"code": "...", "message": "..."}}` error envelope; previously all backend error codes were lost and `code` was always `UNKNOWN_ERROR`

## [1.2.0] - 2026-05-25

### Added
- `client.users` namespace: `getMe()`, `updateMe(name)` — read and update the authenticated user profile
- `client.principals.resolve()` — find an active principal by email or provider_subject
- `client.billing.getSubscription()` — fetch current subscription including `billing_period` and renewal date
- `client.billing.createPortal()` — create a Stripe billing portal session
- `client.dashboard.getStats({ sparklines: true })` — optional sparklines parameter for time-series KPI arrays
- `client.simulator.runBatchPreview()` — evaluate one search against up to 5 principals (Growth+)
- `scripts/check-contract.ts` — CI contract checker: walks OpenAPI spec and asserts SDK coverage

### Fixed
- **Critical:** `client.auth.login()` now correctly unwraps the `{user, tokens}` response envelope; previously `client._token` was never set so all post-login requests failed with 401
- **Critical:** `IdentityProviderType` values corrected to match backend: `"azure_entra_id"`, `"aws_iam"`, `"gcp"` (were `"azure_ad"`, `"google"`, `"custom"` — none existed on the backend)
- `client.connectors.updateSearchConfig()` and `updateIngestionConfig()` now wrap body in `{search_config:...}` / `{ingestion_config:...}` (previously sent bare body, causing 422)

## [1.1.0] - 2026-04-29

### Added
- REBAC relationships resource (`client.relationships.create()`, `.list()`, `.delete()`)
- `Relationship` and `CreateRelationshipRequest` types exported from the package

## [1.0.0] - 2026-04-29

### Added
- API key management (`client.apiKeys.create()`, `.list()`, `.delete()`, `.rotate()`)
- Onboarding status and dismissal (`client.onboarding.status()`, `.dismiss()`)

### Changed
- Initial stable release
