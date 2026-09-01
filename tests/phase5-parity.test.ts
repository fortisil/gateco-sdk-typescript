import { describe, expect, it, vi, afterEach } from "vitest";
import * as sdk from "../src/index.js";
import { GatecoClient } from "../src/client.js";

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.restoreAllMocks());

describe("plan Phase 5: TypeScript SDK parity", () => {
  it("re-exports the two 1.8.0 resource classes from the root", () => {
    expect(typeof sdk.IngestionJobsResource).toBe("function");
    expect(typeof sdk.SourceConnectionsResource).toBe("function");
  });

  it("accepts accessToken / refreshToken like the Python client", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson({ data: [] }));
    const client = new GatecoClient({
      baseUrl: "https://api.test",
      accessToken: "eyJ.access",
      refreshToken: "eyJ.refresh",
    });
    await client.principals.list();
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer eyJ.access");
    expect(client._tokenManager.getRefreshToken()).toBe("eyJ.refresh");
  });

  it("dataCatalog.updateMetadata patches /api/v1/resources/{id}/metadata", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      okJson({ id: "r1", classification: "confidential" }),
    );
    const client = new GatecoClient({ baseUrl: "https://api.test", apiKey: "gck_x" });
    await client.dataCatalog.updateMetadata("r1", { classification: "confidential", labels: ["hr"] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.test/api/v1/resources/r1/metadata");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ classification: "confidential", labels: ["hr"] });
  });

  it("ingest.file sends multipart form data, not JSON", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      okJson({ status: "ingested", resource_id: "r1", chunks_created: 3 }),
    );
    const client = new GatecoClient({ baseUrl: "https://api.test", apiKey: "gck_x" });
    const blob = new Blob(["hello world"], { type: "text/plain" });
    await client.ingest.file("conn-1", blob, "hello.txt", { classification: "public" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.test/api/v1/ingest/file");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    const form = init?.body as FormData;
    expect(form.get("connector_id")).toBe("conn-1");
    expect(form.get("classification")).toBe("public");
    expect((form.get("file") as File).name).toBe("hello.txt");
    const headers = init?.headers as Record<string, string>;
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain("content-type");
  });

  it("ingest.files sends several files in one multipart request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(okJson({ results: [] }));
    const client = new GatecoClient({ baseUrl: "https://api.test", apiKey: "gck_x" });
    await client.ingest.files("conn-1", [
      { file: new Blob(["a"]), filename: "a.txt" },
      { file: new Blob(["b"]), filename: "b.txt" },
    ]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.test/api/v1/ingest/files");
    const form = init?.body as FormData;
    expect(form.getAll("files").length).toBe(2);
  });
});
