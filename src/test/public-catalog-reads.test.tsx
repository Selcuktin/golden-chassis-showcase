import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useByCarStore } from "../lib/bycar";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

it("uses an authoritative empty SSR catalog without an extra D1-backed request", () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  sessionStorage.setItem("bycar_fleet_v8", JSON.stringify([{ id: "stale-private-car" }]));
  const { result } = renderHook(() => useByCarStore({ cars: [] }));
  expect(result.current.cars).toEqual([]);
  expect(fetcher).not.toHaveBeenCalled();
});

it("authenticated admin refresh stays private even when initial cars were supplied", async () => {
  const fetcher = vi.fn(async () => Response.json({ ok: true, cars: [], revision: 1 }));
  vi.stubGlobal("fetch", fetcher);
  sessionStorage.setItem("bycar_admin_token", "bycar_sec_fixture");
  renderHook(() => useByCarStore({ cars: [] }, { admin: true }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(fetcher).toHaveBeenCalledWith("/api/cms", {
    headers: { authorization: "Bearer bycar_sec_fixture" },
  });
});

it("still loads public catalog data when no SSR catalog was supplied", async () => {
  const fetcher = vi.fn(async () => Response.json({ ok: true, cars: [] }));
  vi.stubGlobal("fetch", fetcher);
  renderHook(() => useByCarStore());
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(fetcher).toHaveBeenCalledWith("/api/cms");
});
