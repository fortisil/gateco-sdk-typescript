import { describe, it, expect, vi } from "vitest";
import { GatecoClient } from "../src/client.js";

/** endUserToken becomes the X-End-User-Token header, and only when given. */
function clientWithSpy() {
  const client = new GatecoClient({ apiKey: "test-key", baseUrl: "https://api.example.test" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transport = (client as any)._transport as { request: (...a: unknown[]) => Promise<unknown> };
  const spy = vi.spyOn(transport, "request").mockResolvedValue({ id: "r1", subject_verified: true });
  return { client, spy };
}

function headersOf(spy: ReturnType<typeof vi.spyOn>): Record<string, string> {
  const opts = spy.mock.calls[0]![2] as { headers: Record<string, string> };
  return opts.headers;
}

describe("endUserToken", () => {
  it("execute sends X-End-User-Token alongside the credential", async () => {
    const { client, spy } = clientWithSpy();
    const r = await client.retrievals.execute({
      principalId: "p1", connectorId: "c1", query: "q", endUserToken: "eyJ.tok.en",
    });
    expect(headersOf(spy)["X-End-User-Token"]).toBe("eyJ.tok.en");
    expect(headersOf(spy)["X-API-Key"]).toBe("test-key");
    expect(r.subject_verified).toBe(true);
  });

  it("execute sends no such header when omitted", async () => {
    const { client, spy } = clientWithSpy();
    await client.retrievals.execute({ principalId: "p1", connectorId: "c1", query: "q" });
    expect("X-End-User-Token" in headersOf(spy)).toBe(false);
  });

  it("filter and answers send it too", async () => {
    const { client, spy } = clientWithSpy();
    await client.retrievals.filter({
      principalId: "p1", connectorId: "c1",
      candidates: [{ vector_id: "v", score: 0.5, text: "t" }], endUserToken: "tok",
    });
    await client.answers.execute({ query: "why?", principalId: "p1", connectorId: "c1", endUserToken: "tok2" });
    expect((spy.mock.calls[0]![2] as { headers: Record<string, string> }).headers["X-End-User-Token"]).toBe("tok");
    expect((spy.mock.calls[1]![2] as { headers: Record<string, string> }).headers["X-End-User-Token"]).toBe("tok2");
  });

  it("a caller-supplied Authorization header cannot overwrite the credential", async () => {
    const { client, spy } = clientWithSpy();
    await client._request("GET", "/api/retrievals/r1", { headers: { "X-API-Key": "forged" } });
    expect(headersOf(spy)["X-API-Key"]).toBe("test-key");
  });
});
