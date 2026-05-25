#!/usr/bin/env ts-node
/**
 * Contract checker: verify TypeScript SDK exposes methods for all OpenAPI operationIds.
 *
 * Loads packages/contracts/openapi.json, walks every operationId, derives the
 * expected resource + method name, and checks the exported SDK surface.
 *
 * Run: npx ts-node scripts/check-contract.ts
 * Exit: 0 if covered, 1 if gaps found.
 */

import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "../../../../");
const OPENAPI_PATH = path.join(REPO_ROOT, "packages/contracts/openapi.json");

// Map path segment → SDK resource property name
const RESOURCE_MAP: Record<string, string | null> = {
  "/api/admin": null,
  "/health": null,
  "/api/auth": "auth",
  "/api/plans": "billing",
  "/api/checkout": "billing",
  "/api/billing": "billing",
  "/api/webhooks": null,
  "/api/connectors": "connectors",
  "/api/ingestion": "ingestion",
  "/api/data-catalog": "dataCatalog",
  "/api/policies": "policies",
  "/api/retrievals": "retrievals",
  "/api/simulator": "simulator",
  "/api/answers": "answers",
  "/api/audit-log": "audit",
  "/api/principals": "principals",
  "/api/relationships": "relationships",
  "/api/identity-providers": "identityProviders",
  "/api/api-keys": "apiKeys",
  "/api/users": "users",
  "/api/organization": "users",
  "/api/onboarding": "onboarding",
  "/api/scim": null,
  "/api/pipelines": "pipelines",
};

const SKIP_OPERATION_IDS = new Set([
  "stripe_webhook_api_webhooks_stripe_post",
  "db_status_api_admin_db_status_get",
  "test_connection_api_admin_db_test_post",
  "apply_setup_api_admin_db_apply_post",
  "retry_setup_api_admin_db_retry_post",
  "update_org_plan_api_admin_db_organizations__org_id__plan_patch",
  "health_db_health_db_get",
  "google_auth_api_auth_google_get",
  "github_auth_api_auth_github_get",
  "google_callback_api_auth_google_callback_get",
  "github_callback_api_auth_github_callback_get",
]);

function resolveResource(apiPath: string): string | null {
  for (const [prefix, resource] of Object.entries(RESOURCE_MAP)) {
    if (apiPath.startsWith(prefix)) return resource;
  }
  return null;
}

function deriveMethodName(operationId: string): string {
  return operationId.replace(/_api_.*$/, "").replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

interface OpenApiSpec {
  paths: Record<string, Record<string, { operationId?: string }>>;
}

async function main(): Promise<number> {
  if (!fs.existsSync(OPENAPI_PATH)) {
    console.error(`ERROR: OpenAPI spec not found at ${OPENAPI_PATH}`);
    console.error("Run: cd packages/contracts && npm run generate");
    return 1;
  }

  const spec: OpenApiSpec = JSON.parse(fs.readFileSync(OPENAPI_PATH, "utf8"));

  // Lazy-load the compiled SDK index to get the GatecoClient shape
  // We check the prototype methods of each resource class
  let sdkClient: Record<string, unknown>;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sdkModule = require("../dist/index.js") as { GatecoClient: new (...args: unknown[]) => unknown };
    sdkClient = new sdkModule.GatecoClient({ baseUrl: "http://localhost", apiKey: "test" }) as Record<string, unknown>;
  } catch {
    console.warn("SDK dist not built — run 'npm run build' first. Running in type-only mode.");
    sdkClient = {};
  }

  const gaps: string[] = [];
  let checked = 0;
  let skipped = 0;

  for (const [apiPath, methods] of Object.entries(spec.paths)) {
    for (const [httpMethod, op] of Object.entries(methods)) {
      if (!["get", "post", "patch", "put", "delete"].includes(httpMethod)) continue;
      const operationId = op.operationId;
      if (!operationId || SKIP_OPERATION_IDS.has(operationId)) { skipped++; continue; }

      const resourceAttr = resolveResource(apiPath);
      if (resourceAttr === null) { skipped++; continue; }
      if (resourceAttr === undefined) { skipped++; continue; }

      checked++;
      const expectedMethod = deriveMethodName(operationId);

      const resource = sdkClient[resourceAttr] as Record<string, unknown> | undefined;
      if (!resource) {
        const gap = `MISSING RESOURCE: client.${resourceAttr} — needed for ${httpMethod.toUpperCase()} ${apiPath}`;
        if (!gaps.includes(gap)) gaps.push(gap);
        continue;
      }

      const resourceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(resource))
        .filter(m => m !== "constructor" && !m.startsWith("_"));

      const actionWords = expectedMethod.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`).split("_").filter(w => w.length > 2);
      const found = resourceMethods.some(m => actionWords.every(w => m.toLowerCase().includes(w))) || resourceMethods.includes(expectedMethod);

      if (!found) {
        gaps.push(
          `MISSING: ${httpMethod.toUpperCase()} ${apiPath} → operationId=${operationId} → expected ~${expectedMethod} in client.${resourceAttr} ` +
          `(have: ${resourceMethods.slice(0, 5).join(", ")}...)`
        );
      }
    }
  }

  console.log(`Contract check: ${checked} operations checked, ${skipped} skipped`);
  if (gaps.length > 0) {
    console.error(`\n${gaps.length} gap(s) found:\n`);
    for (const gap of gaps) console.error(`  ✗ ${gap}`);
    return 1;
  }

  console.log(`✓ All ${checked} operations are covered by the TypeScript SDK.`);
  return 0;
}

main().then(code => process.exit(code));
