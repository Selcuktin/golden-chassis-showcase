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

function adminRouter(initialPath = "/admin") {
  const root = createRootRoute({ component: Outlet });
  const route = createRoute({
    getParentRoute: () => root,
    path: "/admin",
    component: AdminRoute.options.component!,
  });
  return createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

beforeEach(() => {
  clearAllBrowserStorage();
  window.sessionStorage.setItem("bycar_admin_token", "bycar_sec_ux-test-token");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
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
      if (url === "/api/admin/inquiries") body = { ok: true, inquiries: [] };
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

it("preserves active admin tab from sessionStorage on reload", async () => {
  window.sessionStorage.setItem("bycar_admin_active_tab", "content");
  window.sessionStorage.setItem("bycar_admin_content_section", "faqs");

  const router = adminRouter();
  render(<RouterProvider router={router} />);

  // Should immediately show CMS Content tab and specifically FAQ section
  await screen.findByText(/6\. Sıkça Sorulan Sorular \(SSS\) Yönetimi/i);
  expect(screen.getByText(/\+ Yeni Sıkça Sorulan Soru Ekle/i)).toBeInTheDocument();
});

it("supports inline editing of FAQ questions and answers", async () => {
  window.sessionStorage.setItem("bycar_admin_active_tab", "content");
  window.sessionStorage.setItem("bycar_admin_content_section", "faqs");

  const router = adminRouter();
  render(<RouterProvider router={router} />);

  // Wait for FAQs to render
  await screen.findByText(/6\. Sıkça Sorulan Sorular \(SSS\) Yönetimi/i);
  const editButtons = screen.getAllByRole("button", { name: /Düzenle/i });
  expect(editButtons.length).toBeGreaterThan(0);

  // Click edit on the first FAQ
  fireEvent.click(editButtons[0]!);

  // Inline edit form should appear with save and cancel buttons
  await screen.findByText(/Soruyu Düzenle \(#1\)/i);
  const saveBtns = screen.getAllByRole("button", { name: /Değişiklikleri Kaydet/i });
  const cancelBtns = screen.getAllByRole("button", { name: /Vazgeç/i });
  expect(saveBtns.length).toBeGreaterThan(0);
  expect(cancelBtns.length).toBeGreaterThan(0);

  // Cancel edit
  fireEvent.click(cancelBtns[0]!);
  expect(screen.queryByText(/Soruyu Düzenle \(#1\)/i)).not.toBeInTheDocument();
});

it("completely removed testimonials tab and showcase toggle", async () => {
  // Test Content subtabs
  window.sessionStorage.setItem("bycar_admin_active_tab", "content");
  const router = adminRouter();
  render(<RouterProvider router={router} />);

  await screen.findByText(/5\. Site İçeriği \(CMS\)/i);
  // Testimonials tab button should NOT exist
  expect(screen.queryByRole("button", { name: /Yorumlar/i })).not.toBeInTheDocument();

  // Switch to System Tab
  fireEvent.click(screen.getByRole("button", { name: /6\. İletişim & D1/i }));
  await screen.findByText(/1\. Showroom İletişim & Sosyal Medya/i);

  // Testimonials showcase toggle should NOT exist
  expect(screen.queryByText(/Müşteri Yorumları & Referanslar/i)).not.toBeInTheDocument();
});

it("removed noisy backup/restore buttons while preserving operational D1 Sync and R2 GC", async () => {
  window.sessionStorage.setItem("bycar_admin_active_tab", "system");
  const router = adminRouter();
  render(<RouterProvider router={router} />);

  await screen.findByText(/1\. Showroom İletişim & Sosyal Medya/i);

  // Removed buttons
  expect(screen.queryByText(/Cloudflare D1 \(\.sql\) Dökümü/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/JSON Tam Yedek İndir/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/JSON Yedekten Yükle/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Yerel Taslağı Temizle/i)).not.toBeInTheDocument();

  // Preserved operational buttons
  expect(screen.getByRole("button", { name: /Buluta Şimdi Senkronize Et/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /R2 Medya Temizliği/i })).toBeInTheDocument();
});

it("provides video upload button and file selection for car presentation video", async () => {
  const router = adminRouter();
  render(<RouterProvider router={router} />);

  await screen.findByText(CARS[0]!.title);
  // Find vehicle row edit button
  const editButtons = screen.getAllByRole("button", { name: /Düzenle/i });
  expect(editButtons.length).toBeGreaterThan(0);
  fireEvent.click(editButtons[0]!);

  // Check section has video upload options
  await screen.findByText(/^Tanıtım Videosu$/i);
  expect(screen.getByText(/Bilgisayardan Video Seç \(MP4 \/ WebM\)/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Veya video URL/i)).toBeInTheDocument();

  // Check Gallery dropzone in section 10 has video upload option
  expect(
    screen.getByText(/Tanıtım Videosunu Güncelle|Bilgisayardan Tanıtım Videosu Seç/i),
  ).toBeInTheDocument();
});

it("provides desktop and mobile hero image file selection buttons in CMS editor", async () => {
  window.sessionStorage.setItem("bycar_admin_active_tab", "content");
  window.sessionStorage.setItem("bycar_admin_content_section", "hero");

  const router = adminRouter();
  render(<RouterProvider router={router} />);

  await screen.findByText(/1\. Hero Karşılama Alanı/i);
  expect(
    screen.getByText(/Bilgisayardan Masaüstü Görseli Seç \(PNG \/ JPG \/ WEBP\)/i),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Bilgisayardan Mobil Görseli Seç \(PNG \/ JPG \/ WEBP\)/i),
  ).toBeInTheDocument();
});
