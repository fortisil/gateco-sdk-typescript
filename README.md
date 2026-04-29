# @gateco/sdk

TypeScript SDK for the Gateco API. Zero runtime dependencies -- uses native `fetch`.

[![GitHub](https://img.shields.io/badge/GitHub-gateco--sdk--typescript-blue)](https://github.com/fortisil/gateco-sdk-typescript)
[![npm](https://img.shields.io/npm/v/@gateco/sdk)](https://www.npmjs.com/package/@gateco/sdk)

## Why Gateco?

Your AI model should never see data a user is not authorized to access. Gateco sits between your retrieval layer and your LLM, enforcing policy decisions before any chunk reaches the model:

```typescript
import { GatecoClient } from "@gateco/sdk";

const client = new GatecoClient({ apiKey: "gck_live_abc123..." });

const result = await client.retrievals.execute({
  query: "What is the CEO's salary?",
  principalId: "user_james_wu",
  connectorId: "connector_hr_docs",
  searchMode: "hybrid",
});

// result.allowedChunks → [] (denied by policy)
// result.deniedCount  → 1
// Your AI model never sees the salary data
```

## Installation

```bash
npm install @gateco/sdk
```

Requires Node.js >= 18.0.0.

## Authentication

```typescript
// API key (recommended for server-side use)
const client = new GatecoClient({
  baseUrl: "https://api.gateco.ai",
  apiKey: "gck_live_abc123...",
});

// Email + password (interactive login)
const client = new GatecoClient({ baseUrl: "https://api.gateco.ai" });
await client.login("user@example.com", "password");
```

## Quick Start

```typescript
import { GatecoClient } from "@gateco/sdk";

const client = new GatecoClient({ apiKey: "gck_live_abc123..." });

// Execute a permission-gated retrieval (vector search, default)
const retrieval = await client.retrievals.execute({
  principalId: "user-123",
  connectorId: "conn-456",
  query: "quarterly revenue",
  topK: 10,
});
console.log(retrieval.outcomes); // allowed/denied per chunk

// Keyword search (ranked full-text search)
const keyword = await client.retrievals.execute({
  principalId: "user-123",
  connectorId: "conn-456",
  query: "quarterly revenue",
  searchMode: "keyword",
  topK: 10,
});

// Hybrid search (vector + keyword fused)
const hybrid = await client.retrievals.execute({
  principalId: "user-123",
  connectorId: "conn-456",
  query: "quarterly revenue",
  searchMode: "hybrid",
  alpha: 0.5, // 1.0=all-vector, 0.0=all-keyword
  topK: 10,
});

// Grep search (exact pattern matching)
const grep = await client.retrievals.execute({
  principalId: "user-123",
  connectorId: "conn-456",
  query: "ERR-4021",
  searchMode: "grep",
});

// Grounded answer synthesis with citations (Pro+)
const answer = await client.answers.execute({
  query: "What was our Q4 revenue?",
  principalId: "user-123",
  connectorId: "conn-456",
  searchMode: "hybrid",
  alpha: 0.5,
});
console.log(answer.answer);  // Synthesized text or null
console.log(answer.outcome); // "answered", "no_access", or "insufficient_context"

client.close();
```

## Resource Namespaces

| Namespace | Description |
|-----------|-------------|
| `client.auth` | Login, signup, refresh, logout |
| `client.connectors` | Connector CRUD, test, bind, config, coverage, classification suggestions |
| `client.ingest` | Single document and batch ingestion |
| `client.retrievals` | Execute, filter, list, get secured retrievals |
| `client.policies` | Policy CRUD, activate, archive, and templates |
| `client.answers` | Grounded answer synthesis with citations (Pro+) |
| `client.identityProviders` | Identity provider CRUD and sync |
| `client.principals` | Principal listing, detail, and resolve |
| `client.dataCatalog` | Gated resource listing and metadata updates |
| `client.pipelines` | Pipeline CRUD and run management |
| `client.billing` | Plans, usage, invoices, subscription, checkout |
| `client.audit` | Audit log listing and CSV export |
| `client.simulator` | Access simulation dry-runs (Pro+) |
| `client.dashboard` | Dashboard statistics |
| `client.retroactive` | Retroactive vector registration |
| `client.onboarding` | Onboarding wizard status and dismissal |
| `client.apiKeys` | API key create, list, delete, and rotate |

## API Keys

```typescript
// Create a new API key
const created = await client.apiKeys.create({
  name: "CI pipeline",
  expires_at: "2027-01-01T00:00:00Z", // optional
});
console.log(created.key); // plaintext -- copy it now, never shown again

// List existing keys (plaintext never returned)
const { data: keys } = await client.apiKeys.list();
keys.forEach((k) => console.log(k.prefix, k.last_used_at));

// Rotate a key (old key immediately revoked)
const rotated = await client.apiKeys.rotate(keys[0].id);
console.log(rotated.key); // new plaintext key

// Revoke a key
await client.apiKeys.delete(keys[0].id);
```

## Onboarding

```typescript
// Check setup progress
const status = await client.onboarding.status();
console.log(`${status.completed_count}/${status.total_count} steps complete`);
status.steps.forEach((s) => console.log(s.step_id, s.status));

// Dismiss the checklist
await client.onboarding.dismiss();
```

## Principal Resolution

```typescript
// Resolve by email
const principal = await client.principals.resolve({ email: "alice@company.com" });

// Resolve by provider subject (raw IDP-side user ID)
const principal = await client.principals.resolve({ providerSubject: "okta-user-123" });

// Scoped to a specific identity provider
const principal = await client.principals.resolve({
  email: "alice@company.com",
  identityProviderId: "idp-uuid-here",
});
```

Resolution is read-only -- it finds existing active principals but never creates them.
Returns `NotFoundError` if no active principal matches.

## Pagination

```typescript
// Single page
const page = await client.connectors.list(1, 20);
console.log(page.items, page.total, page.totalPages);

// Iterate all pages automatically
for await (const connector of client.connectors.listAll()) {
  console.log(connector.name);
}
```

## Error Handling

```typescript
import { GatecoClient, NotFoundError, RateLimitError, EntitlementError } from "@gateco/sdk";

try {
  await client.connectors.get("nonexistent-id");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("Connector not found");
  } else if (err instanceof RateLimitError) {
    console.log(`Rate limited, retry after ${err.retryAfter}s`);
  } else if (err instanceof EntitlementError) {
    console.log("Feature requires a higher plan");
  }
}
```

## Development

```bash
npm install
npm run build       # Compile TypeScript
npm test            # Run tests
npm run typecheck   # Type check without emit
```

## Links

- [Documentation](https://gateco.ai/docs)
- [API Reference](https://gateco.ai/docs/api)
- [GitHub](https://github.com/fortisil/gateco-sdk-typescript)
- [Support](mailto:support@gateco.ai)
