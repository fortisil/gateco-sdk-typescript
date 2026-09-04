#!/usr/bin/env node
/**
 * Contract checker: does the TypeScript SDK expose a method for every OpenAPI operation?
 *
 * Plain Node, no build and no dependencies: it reads packages/contracts/openapi.json and
 * the resource classes' SOURCE (src/resources/*.ts), so it runs the same in CI and locally.
 * Mirrors packages/sdk-python/scripts/check_contract.py rule for rule; keep the two in step.
 *
 * Run: node scripts/check-contract.mjs      Exit: 0 covered, 1 gaps.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = path.resolve(HERE, "../../..");          // gateco/
const OPENAPI_PATH = path.join(MONOREPO_ROOT, "packages/contracts/openapi.json");
const RESOURCES_DIR = path.join(HERE, "../src/resources");

// URL prefix -> [client property, resource source file]; null = deliberately outside the SDK (say why).
// Longest prefix wins. A prefix in the spec that is missing here FAILS the check.
const RESOURCE_MAP = {
  "/": null,                       // root banner
  "/health": null,                 // liveness / readiness probes
  "/api/admin": null,              // X-Admin-Token setup console
  "/api/platform": null,           // platform-admin console
  "/api/webhooks": null,           // Stripe calls us
  "/api/marketplace": null,        // AWS Marketplace calls us
  "/api/scim": null,               // the IdP calls us
  "/api/benchmark": null,          // Performance Self-Test: in-app, login-gated by ruling (2026-08-31)
  "/api/capabilities": null,       // public capability matrix consumed by the app
  "/api/auth": ["auth", "auth.ts"],
  "/api/plans": ["billing", "billing.ts"], "/api/checkout": ["billing", "billing.ts"], "/api/billing": ["billing", "billing.ts"],
  "/api/connectors": ["connectors", "connectors.ts"],
  "/api/v1/ingest/jobs": ["ingest.jobs", "ingestionJobs.ts"],
  "/api/v1/ingest": ["ingest", "ingestion.ts"],
  "/api/v1/resources": ["dataCatalog", "data-catalog.ts"],
  "/api/v1/retroactive-register": ["retroactive", "retroactive.ts"],
  "/api/data-catalog": ["dataCatalog", "data-catalog.ts"],
  "/api/policies": ["policies", "policies.ts"],
  "/api/retrievals": ["retrievals", "retrievals.ts"],
  "/api/simulator": ["simulator", "simulator.ts"],
  "/api/answers": ["answers", "answers.ts"],
  "/api/audit-log": ["audit", "audit.ts"],
  "/api/principals": ["principals", "principals.ts"],
  "/api/groups": ["groups", "groups.ts"],
  "/api/relationships": ["relationships", "relationships.ts"],
  "/api/identity-providers": ["identityProviders", "identity-providers.ts"],
  "/api/api-keys": ["apiKeys", "api-keys.ts"],
  "/api/users": ["users", "users.ts"], "/api/organization": ["users", "users.ts"], "/api/team": ["users", "users.ts"],
  "/api/onboarding": ["onboarding", "onboarding.ts"],
  "/api/pipelines": ["pipelines", "pipelines.ts"],
  "/api/source-connections": ["sources", "sourceConnections.ts"],
  "/api/dashboard": ["dashboard", "dashboard.ts"],
};
const SKIP_OPERATION_IDS = new Set([
  "stripe_webhook_api_webhooks_stripe_post",
  "google_auth_api_auth_google_get", "github_auth_api_auth_github_get",
  "google_callback_api_auth_google_callback_get", "github_callback_api_auth_github_callback_get",
]);
// route function name -> SDK method (camelCase), where the SDK chose a different name on purpose
const EXPLICIT_METHOD = {
  deactivate_principal: "delete", list_runs: "getRuns", export_audit_log: "exportCsv",
  onboarding_status: "status", dismiss_onboarding: "dismiss", list_plans: "getPlans",
  ingest_document: "document", retroactive_register: "register",
};
const VERB_SYNONYMS = { deactivate: ["delete"], remove: ["delete"], patch: ["update"], fetch: ["get"] };
// operations the SDK deliberately does not expose, with the reason
const KNOWN_GAPS = {
  stream_audit_log: "server-sent events stream; SDKs expose list/export instead",
  submit_profile: "onboarding profile form is app-only (plan Phase 6 decides)",
  update_pipeline: "pipelines are app-managed in v1",
  run_pipeline: "pipelines are app-managed in v1; scheduled by the worker",
  get_db_schema: "Search Config dialog helper; SDK method lands in plan Phase 5",
  set_embedding_profile: "connector embedding profile is declared in the Search Config UI during setup; SDK method is a fast-follow",
  get_preflight: "connector preflight is app-only until plan Phase 5",
  get_activation_stats: "dashboard activation card; app-only",
  list_team_invites: "team invites are managed in the app", create_team_invite: "team invites are managed in the app",
  revoke_team_invite: "team invites are managed in the app",
  ingest_file: "TypeScript SDK has no multipart transport yet (plan Phase 5)",
  ingest_files: "TypeScript SDK has no multipart transport yet (plan Phase 5)",
  update_resource_metadata: "Python has dataCatalog.update_metadata; TypeScript gets it in plan Phase 5 (SDK parity)",
};

const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const fnName = (operationId) => operationId.replace(/_api_.*$/, "").replace(/_v1_.*$/, "");

function resolveResource(apiPath) {
  const prefixes = Object.keys(RESOURCE_MAP).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    const mapping = RESOURCE_MAP[prefix];
    if (apiPath === prefix || apiPath.startsWith(prefix.replace(/\/$/, "") + "/")) return { mapping, prefix };
  }
  return undefined;
}
function methodsOf(file) {
  const src = fs.readFileSync(path.join(RESOURCES_DIR, file), "utf8");
  const names = new Set();
  for (const m of src.matchAll(/^\s+(?:public\s+)?(?:async\s+)?\*?([a-zA-Z][a-zA-Z0-9]*)\s*(?:<[^>]*>)?\(/gm)) {
    const n = m[1];
    if (!["constructor", "if", "for", "while", "switch", "catch", "return", "function", "async"].includes(n)) names.add(n);
  }
  return names;
}
function covered(fn, apiPath, prefix, methods) {
  if (fn in EXPLICIT_METHOD) return methods.has(EXPLICIT_METHOD[fn]);
  const segments = apiPath.slice(prefix.length).split("/").filter((s) => s && !s.startsWith("{"));
  if (segments.length) {
    const tokens = segments.flatMap((s) => s.split("-")).map((t) => t.replace(/s$/, "").toLowerCase());
    return [...methods].some((m) => tokens.every((t) => m.toLowerCase().includes(t)));
  }
  const verb = fn.split("_")[0];
  const wanted = [verb, ...(VERB_SYNONYMS[verb] || [])];
  return wanted.some((w) => methods.has(w));
}

const spec = JSON.parse(fs.readFileSync(OPENAPI_PATH, "utf8"));
const cache = new Map();
const gaps = [], known = [];
let checked = 0, skipped = 0;
for (const [apiPath, ops] of Object.entries(spec.paths)) {
  for (const [http, op] of Object.entries(ops)) {
    if (!["get", "post", "patch", "put", "delete"].includes(http)) continue;
    const id = op.operationId;
    const r = resolveResource(apiPath);
    if (!id || SKIP_OPERATION_IDS.has(id)) { skipped++; continue; }
    if (!r) { const g = `UNMAPPED PREFIX: ${apiPath} -> add it to RESOURCE_MAP (with a reason if it is not for the SDK)`; if (!gaps.includes(g)) gaps.push(g); continue; }
    if (r.mapping === null) { skipped++; continue; }
    const [attr, file] = r.mapping;
    checked++;
    if (!cache.has(attr)) cache.set(attr, fs.existsSync(path.join(RESOURCES_DIR, file)) ? methodsOf(file) : new Set());
    const methods = cache.get(attr);
    if (!methods.size) { gaps.push(`MISSING RESOURCE: client.${attr} (${file}) for ${http.toUpperCase()} ${apiPath}`); continue; }
    const fn = fnName(id);
    if (covered(fn, apiPath, r.prefix, methods)) continue;
    if (fn in KNOWN_GAPS) { known.push(`${http.toUpperCase()} ${apiPath}: ${KNOWN_GAPS[fn]}`); continue; }
    gaps.push(`MISSING: ${http.toUpperCase()} ${apiPath} -> ${fn} in client.${attr} (have: ${[...methods].sort().join(", ")})`);
  }
}
console.log(`Contract check: ${checked} operations checked, ${skipped} skipped, ${known.length} known gaps`);
for (const k of known) console.log(`  . known gap: ${k}`);
if (gaps.length) {
  console.error(`\n${gaps.length} gap(s) found:\n`);
  for (const g of gaps) console.error(`  x ${g}`);
  process.exit(1);
}
console.log(`All ${checked} operations are covered by the TypeScript SDK.`);
