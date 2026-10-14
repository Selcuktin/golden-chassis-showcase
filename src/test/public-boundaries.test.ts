// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { handleApiRequest, resetRateLimitsForTesting } from "../server/api";
import { canonicalSiteRedirect } from "../server/site-origin";

beforeEach(resetRateLimitsForTesting);
describe("Malformed and bounded public requests", () => {
  it.each([
    null,
    [],
    "text",
    { name: {} },
    { name: "Test Client", phone: "abcdefghi", car: "BMW M5", offerOrBudget: "Info" },
  ])("rejects malformed inquiry %j", async (body) => {
    const response = await handleApiRequest(
      new Request("https://bycar.test/api/inquiry", { method: "POST", body: JSON.stringify(body) }),
      { ADMIN_PASSWORD: "local-only" },
    );
    expect(response?.status).toBe(400);
  });
  it("enforces a streamed body limit without relying on Content-Length", async () => {
    const response = await handleApiRequest(
      new Request("https://bycar.test/api/inquiry", {
        method: "POST",
        body: JSON.stringify({ details: "x".repeat(65536) }),
      }),
      { ADMIN_PASSWORD: "local-only" },
    );
    expect(response?.status).toBe(413);
  });
  it("rejects null login JSON as a client error", async () => {
    const response = await handleApiRequest(
      new Request("https://bycar.test/api/admin/login", { method: "POST", body: "null" }),
      { ADMIN_PASSWORD: "local-only" },
    );
    expect(response?.status).toBe(400);
  });
});
describe("Purchased domain activation", () => {
  it("leaves the working preview origin available until SITE_URL is configured", () => {
    expect(canonicalSiteRedirect(new Request("https://preview.workers.dev/"))).toBeNull();
  });
  it.each(["GET", "POST"])(
    "redirects aliases while preserving the path/query and %s method",
    (method) => {
      const response = canonicalSiteRedirect(
        new Request("https://www.bycar.test/api/inquiry?source=showroom", { method }),
        "https://bycar.test",
      );
      expect(response?.status).toBe(308);
      expect(response?.headers.get("location")).toBe(
        "https://bycar.test/api/inquiry?source=showroom",
      );
      expect(response?.headers.get("cache-control")).toBe("no-store");
    },
  );
  it("does not loop on the canonical domain", () => {
    expect(
      canonicalSiteRedirect(new Request("https://bycar.test/admin"), "https://bycar.test/"),
    ).toBeNull();
  });
  it("keeps double-slash paths on the configured domain", () => {
    const response = canonicalSiteRedirect(
      new Request("https://preview.workers.dev//example.org/admin"),
      "https://bycar.test",
    );
    expect(new URL(response!.headers.get("location")!).origin).toBe("https://bycar.test");
  });
  it.each(["http://bycar.test", "https://bycar.test/nested", "https://user:password@bycar.test"])(
    "rejects invalid canonical configuration %s",
    (url) => {
      expect(canonicalSiteRedirect(new Request("https://preview.workers.dev/"), url)?.status).toBe(
        503,
      );
    },
  );
});
