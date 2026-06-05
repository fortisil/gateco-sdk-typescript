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
