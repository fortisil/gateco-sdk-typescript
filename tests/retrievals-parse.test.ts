import { describe, expect, it } from "vitest";
import { parseFilterResult, parseSecuredRetrieval } from "../src/types/retrievals";

describe("parseFilterResult", () => {
  it("keeps the policy-decision fields the execute endpoint returns", () => {
    const r = parseFilterResult({
      vector_id: "vec-1",
      score: 0.91,
      text: null,
      resource_id: null,
      granted: false,
      policy_decision: "denied",
      denial_reason: "Denied by policy",
      chunk_id: null,
      matched_policy_id: "2f0c2a2e-8d0a-4b4e-9d7e-2c0e8b3a1f10",
      metadata_resolution_mode_used: "inline",
    });
    expect(r.matched_policy_id).toBe("2f0c2a2e-8d0a-4b4e-9d7e-2c0e8b3a1f10");
    expect(r.metadata_resolution_mode_used).toBe("inline");
    expect(r.chunk_id).toBeNull();
  });
});

describe("parseSecuredRetrieval", () => {
  it("derives granted_count/denied_count/total_results from the API's *_chunks and results (0cc-b)", () => {
    const r = parseSecuredRetrieval({
      allowed_chunks: 5,
      denied_chunks: 0,
      results: [
        { vector_id: "a", granted: true },
        { vector_id: "b", granted: true },
      ],
    });
    expect(r.granted_count).toBe(5);
    expect(r.denied_count).toBe(0);
    expect(r.total_results).toBe(2);
  });
});

describe("parseSecuredRetrieval caller attribution (migrations 051/052)", () => {
  it("surfaces who asserted the subject and whether it was verified", () => {
    const r = parseSecuredRetrieval({
      id: "r1",
      principal_id: "alice",
      actor_type: "api_key",
      actor_name: "API key 'agent' (gck_ab12)",
      actor_id: null,
      api_key_id: "key-1",
      subject_verified: true,
    });
    expect(r.actor_type).toBe("api_key");
    expect(r.api_key_id).toBe("key-1");
    expect(r.actor_id).toBeNull();
    expect(r.subject_verified).toBe(true);
  });

  it("defaults subject_verified to false and actor fields to null on older records", () => {
    const r = parseSecuredRetrieval({ id: "r0" });
    expect(r.subject_verified).toBe(false);
    expect(r.actor_type).toBeNull();
  });
});
