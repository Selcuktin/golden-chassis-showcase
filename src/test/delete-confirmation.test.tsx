import {
  createRootRoute,
  createRoute,
  Outlet,
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Route as AdminRoute } from "../routes/admin";
import { CARS, DEFAULT_CMS_CONFIG, DEFAULT_SETTINGS, clearAllBrowserStorage } from "../lib/bycar";

function adminRouter() {
  const root = createRootRoute({ component: Outlet });
  const route = createRoute({
    getParentRoute: () => root,
    path: "/admin",
    component: AdminRoute.options.component!,
  });
  return createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/admin"] }),
  });
}

let calls: Array<{ url: string; method: string; body?: BodyInit | null | undefined }>;
beforeEach(() => {
  calls = [];
  clearAllBrowserStorage();
  window.sessionStorage.setItem("bycar_admin_token", "bycar_sec_local-confirmation-test");
  vi.spyOn(window, "confirm").mockReturnValue(false);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method || "GET", body: init?.body });
      let body: unknown = { ok: true };
      if (url === "/api/admin/me") body = { ok: true, authenticated: true };
      if (url === "/api/cms")
        body = {
          ok: true,
          source: "d1",
          revision: 1,
          cars: [CARS[0]],
          settings: DEFAULT_SETTINGS,
          cmsConfig: DEFAULT_CMS_CONFIG,
        };
      if (url === "/api/admin/inquiries")
        body = {
          ok: true,
          inquiries: [
            {
              id: "request-1",
              name: "Test Client",
              phone: "+905551234567",
              car: "BMW",
              type: "Teklif",
              offerOrBudget: "Info",
              time: "Now",
              status: "Yeni",
            },
          ],
        };
      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("cancelling vehicle deletion keeps the listing and sends no catalog mutation", async () => {
  const router = adminRouter();
  render(<RouterProvider router={router} />);
  await screen.findByText(CARS[0]!.title);
  fireEvent.click(screen.getByTitle("Aracı Sil (Geri Alınabilir)"));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining(CARS[0]!.title));
  expect(screen.getByText(CARS[0]!.title)).toBeInTheDocument();
  expect(calls.filter((call) => call.url === "/api/cms" && call.method === "POST")).toEqual([]);
});

it("cancelling customer deletion sends no delete request and keeps the inbox item", async () => {
  const router = adminRouter();
  render(<RouterProvider router={router} />);
  await screen.findByText(CARS[0]!.title);
  fireEvent.click(screen.getByRole("button", { name: /3\. Talepler/ }));
  await screen.findByText("Test Client");
  fireEvent.click(screen.getByTitle("Talebi Sil"));
  await waitFor(() => expect(window.confirm).toHaveBeenCalled());
  expect(calls.filter((call) => call.url === "/api/admin/inquiries/delete")).toEqual([]);
  expect(screen.getByText("Test Client")).toBeInTheDocument();
});

it("confirming vehicle deletion sends its ID once, including when it is the last listing", async () => {
  vi.mocked(window.confirm).mockReturnValue(true);
  render(<RouterProvider router={adminRouter()} />);
  await screen.findByText(CARS[0]!.title);
  fireEvent.click(screen.getByTitle("Aracı Sil (Geri Alınabilir)"));
  await waitFor(() =>
    expect(calls.filter((call) => call.url === "/api/cms" && call.method === "POST")).toHaveLength(
      1,
    ),
  );
  const request = calls.find((call) => call.url === "/api/cms" && call.method === "POST")!;
  expect(JSON.parse(String(request.body)).deletedCarIds).toEqual([CARS[0]!.id]);
});
