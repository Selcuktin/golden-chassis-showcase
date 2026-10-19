import { describe, expect, it } from "vitest";
import server from "../server";
import { transferWriteLock } from "../server/transfer-lock";

describe("account transfer write lock", () => {
  it("is disabled unless explicitly enabled and keeps reads available", () => {
    for (const env of [undefined, {}, { TRANSFER_WRITE_LOCK: "false" }]) {
      expect(
        transferWriteLock(new Request("https://local.invalid", { method: "POST" }), env),
      ).toBeNull();
    }
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(
        transferWriteLock(new Request("https://local.invalid", { method }), {
          TRANSFER_WRITE_LOCK: "true",
        }),
      ).toBeNull();
    }
  });

  it("blocks every mutating method on canonical and alias hosts before redirection", async () => {
    for (const host of ["bycaretiler.com", "www.bycaretiler.com", "old-worker.workers.dev"]) {
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        const response = await server.fetch(
          new Request(`https://${host}/api/admin/login`, { method }),
          {
            TRANSFER_WRITE_LOCK: "true",
            SITE_URL: "https://bycaretiler.com",
          },
          {},
        );
        expect(response.status).toBe(503);
        expect(response.headers.get("location")).toBeNull();
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("retry-after")).toBe("300");
      }
    }
  });
});
