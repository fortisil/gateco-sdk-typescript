# @gateco/sdk

TypeScript SDK for the Gateco API. Zero runtime dependencies -- uses native `fetch`.

[![GitHub](https://img.shields.io/badge/GitHub-gateco--sdk--typescript-blue)](https://github.com/fortisil/gateco-sdk-typescript)

## Installation

```bash
npm install @gateco/sdk
```

Requires Node.js >= 18.0.0.

## Quick Start

```typescript
import { GatecoClient } from "@gateco/sdk";

const client = new GatecoClient({
  baseUrl: "https://api.gateco.ai",
});

// Authenticate
await client.login("user@example.com", "password");

// List connectors
const page = await client.connectors.list();
console.log(page.items);

// Execute a permission-gated retrieval
const retrieval = await client.retrievals.execute({
  principalId: "user-123",
  connectorId: "conn-456",
  query: "quarterly revenue",
  topK: 10,
});
console.log(retrieval.outcomes);

// Grounded answer synthesis with citations
const answer = await client.answers.execute({
  query: "What was our Q4 revenue?",
  principalId: "user-123",
  connectorId: "conn-456",
});
console.log(answer.answer);   // Synthesized text or null
console.log(answer.outcome);  // "answered", "no_access", or "insufficient_context"

// Clean up
client.close();
```

## API Key Authentication

```typescript
const client = new GatecoClient({
  baseUrl: "https://api.gateco.ai",
  apiKey: "your-api-key",
});

// No login needed -- API key is sent with every request
const connectors = await client.connectors.list();
```

## Pagination

```typescript
// Single page
const page = await client.connectors.list(1, 20);
console.log(page.items, page.total, page.totalPages);

// Iterate all pages
for await (const connector of client.connectors.listAll()) {
  console.log(connector.name);
}
```

## Error Handling

```typescript
import { GatecoClient, NotFoundError, RateLimitError } from "@gateco/sdk";

try {
  await client.connectors.get("nonexistent-id");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("Connector not found");
  } else if (err instanceof RateLimitError) {
    console.log(`Rate limited, retry after ${err.retryAfter}s`);
  }
}
```

## Resource Namespaces

| Namespace | Description |
|-----------|-------------|
| `client.auth` | Login, signup, refresh, logout |
| `client.connectors` | Connector CRUD, test, bind, config, coverage, classification suggestions |
| `client.ingest` | Single document and batch ingestion |
| `client.retrievals` | Execute, filter, list, get secured retrievals |
| `client.policies` | Policy CRUD, activate, archive |
| `client.answers` | Grounded answer synthesis with citations |
| `client.identityProviders` | Identity provider CRUD and sync |
| `client.principals` | Principal listing and detail |
| `client.dataCatalog` | Gated resource listing and metadata updates |
| `client.pipelines` | Pipeline CRUD and run management |
| `client.billing` | Plans, usage, invoices, subscription, checkout |
| `client.audit` | Audit log listing and CSV export |
| `client.simulator` | Access simulation dry-runs |
| `client.dashboard` | Dashboard statistics |
| `client.retroactive` | Retroactive vector registration |

## Development

```bash
npm install
npm run build       # Compile TypeScript
npm test            # Run tests
npm run typecheck   # Type check without emit
```
