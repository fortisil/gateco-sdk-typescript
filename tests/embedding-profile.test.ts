import { afterEach, describe, expect, it, vi } from "vitest";
import { GatecoClient } from "../src/client.js";

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.restoreAllMocks());

describe("connectors.setEmbeddingProfile", () => {
  it("PATCHes /api/connectors/{id}/embedding-profile with the profile body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      okJson({ id: "c1", ingestion_config: { embedding_provider: "openai_compatible" } }),
    );
    const client = new GatecoClient({ baseUrl: "https://api.test", apiKey: "gck_x" });
    await client.connectors.setEmbeddingProfile("c1", {
      provider: "openai_compatible", model: "bge-small", dimensions: 384, baseUrl: "http://localhost:1234/v1",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.test/api/connectors/c1/embedding-profile");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({
      provider: "openai_compatible", model: "bge-small", dimensions: 384, base_url: "http://localhost:1234/v1",
    });
  });
});
