import { describe, it, expect } from "vitest";

// This test closes Gap #6: verify that all previously-missing types and
// resources are now importable from the root SDK entry point.
import {
  // Resources added in 1.4.0
  UsersResource,
  RelationshipsResource,
  // Directory resource
  GroupsResource,
  // LLM credit errors
  LlmCreditExhaustedError,
  LlmKeyNotConfiguredError,
} from "../src/index.js";

// Type-only imports — these must not be undefined at runtime for classes,
// and must compile cleanly for types (checked by tsc --noEmit).
import type {
  OrgSettings,
  UpdateOrgSettingsRequest,
  ListRelationshipsParams,
  ListPrincipalsOptions,
  ListGroupsOptions,
  PrincipalGroup,
} from "../src/index.js";

describe("SDK root export completeness (Gap #6)", () => {
  it("UsersResource is exported as a constructor", () => {
    expect(typeof UsersResource).toBe("function");
  });

  it("RelationshipsResource is exported as a constructor", () => {
    expect(typeof RelationshipsResource).toBe("function");
  });

  it("LlmCreditExhaustedError is exported and is an Error subclass", () => {
    expect(typeof LlmCreditExhaustedError).toBe("function");
    const err = new LlmCreditExhaustedError();
    expect(err).toBeInstanceOf(Error);
  });

  it("LlmKeyNotConfiguredError is exported and is an Error subclass", () => {
    expect(typeof LlmKeyNotConfiguredError).toBe("function");
    const err = new LlmKeyNotConfiguredError();
    expect(err).toBeInstanceOf(Error);
  });

  it("OrgSettings type is structurally valid", () => {
    // Compile-time check: if OrgSettings is not exported, tsc fails.
    // Runtime check: construct a conformant object and assert no TS error.
    const settings: OrgSettings = {
      name: "Test Org",
      plan: "free",
    } as OrgSettings;
    expect(settings).toBeTruthy();
  });

  it("UpdateOrgSettingsRequest type is structurally valid", () => {
    const req: UpdateOrgSettingsRequest = {} as UpdateOrgSettingsRequest;
    expect(req).toBeDefined();
  });

  it("ListRelationshipsParams type is structurally valid", () => {
    const params: ListRelationshipsParams = {} as ListRelationshipsParams;
    expect(params).toBeDefined();
  });

  it("GroupsResource is exported as a constructor", () => {
    expect(typeof GroupsResource).toBe("function");
  });

  it("ListPrincipalsOptions type is structurally valid", () => {
    const opts: ListPrincipalsOptions = { status: "all", group: "eng" };
    expect(opts).toBeDefined();
  });

  it("ListGroupsOptions and PrincipalGroup types are structurally valid", () => {
    const opts: ListGroupsOptions = { search: "eng" };
    const group: PrincipalGroup = { id: "g1", member_count: 0 };
    expect(opts).toBeDefined();
    expect(group.member_count).toBe(0);
  });
});
