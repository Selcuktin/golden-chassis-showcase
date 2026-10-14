import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  waLink,
  renderContactTemplate,
  syncInquiriesFromServer,
  CARS,
  DEFAULT_CMS_CONFIG,
  deleteStoredCar,
  restoreUndoSnapshot,
  saveUndoSnapshot,
  exportD1SqlDump,
  T,
  addStoredInquiry,
  clearAllBrowserStorage,
  getPendingDeletedCarIds,
  getStoredCars,
  getStoredCmsRevision,
  getStoredInquiries,
  hasUnsavedCmsChanges,
  importDatabaseJSON,
  saveStoredCars,
  setStoredCmsRevision,
  syncFromServer,
  syncToServer,
  updateInquiryOnServer,
  useByCarStore,
} from "../lib/bycar";
import { ImportRequestForm, QuickOfferForm } from "../routes/index";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { CmsConfigSchema, SettingsSchema } from "../lib/cms-validation";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  clearAllBrowserStorage();
  window.sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Customer inquiry confirmation", () => {
  it.each([500, 429])(
    "rejects HTTP %s without storing fake customer records or syncing the catalog",
    async (status) => {
      const fetch = vi.fn().mockResolvedValue(json({ ok: false, error: "Kaydedilemedi" }, status));
      vi.stubGlobal("fetch", fetch);
      await expect(
        addStoredInquiry({
          type: "Teklif",
          name: "Test User",
          phone: "+905551234567",
          car: "BMW",
          offerOrBudget: "Bilgi",
        }),
      ).rejects.toThrow("Kaydedilemedi");
      expect(getStoredInquiries()).toEqual([]);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0]![0]).toBe("/api/inquiry");
    },
  );

  it("retains the offer form on failure and shows success only after a confirmed retry", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ error: "Bağlantı hatası" }, 503))
      .mockResolvedValueOnce(json({ ok: true, inquiryId: "real-id" }));
    vi.stubGlobal("fetch", fetch);
    render(<QuickOfferForm carTitle="BMW M5" vehicleId="m5" t={T.tr} autoWhatsApp={false} />);
    fireEvent.change(screen.getByPlaceholderText(T.tr.f.name), { target: { value: "Test User" } });
    fireEvent.change(screen.getByPlaceholderText(T.tr.f.phone), {
      target: { value: "+905551234567" },
    });
    fireEvent.change(screen.getByPlaceholderText(T.tr.f.offer), {
      target: { value: "Bilgi almak istiyorum" },
    });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: T.tr.send }).closest("form")!);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Bağlantı hatası");
    expect(screen.queryByText(T.tr.sent)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(T.tr.f.name)).toHaveValue("Test User");
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: T.tr.send }).closest("form")!);
    });
    expect(screen.getByText(T.tr.sent)).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[1]![1].body)).toMatchObject({ vehicleId: "m5" });
  });

  it("does not submit a second import request while the first is pending", async () => {
    let complete!: (value: Response) => void;
    const fetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<ImportRequestForm t={T.tr} lang="tr" autoWhatsApp={false} />);
    const form = screen.getByRole("button", { name: T.tr.send }).closest("form")!;
    fireEvent.submit(form);
    expect(screen.getByRole("button", { name: "Gönderiliyor…" })).toBeDisabled();
    fireEvent.submit(form);
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      complete(json({ ok: true, inquiryId: "import-id" }));
    });
    expect(screen.getByText(T.tr.sent)).toBeInTheDocument();
  });
});

describe("Authoritative catalog and concurrent saves", () => {
  it("keeps an empty catalog empty instead of resurrecting bundled examples", async () => {
    window.sessionStorage.setItem("bycar_admin_token", "test");
    saveStoredCars([CARS[0]!]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json({ ok: true, source: "d1", revision: 8, cars: [] })),
    );
    expect((await syncFromServer(true)).ok).toBe(true);
    expect(getStoredCars()).toEqual([]);
    expect(getStoredCmsRevision()).toBe(8);
  });

  it("preserves the local draft and base revision on conflict and on background refresh", async () => {
    window.sessionStorage.setItem("bycar_admin_token", "test");
    setStoredCmsRevision(4);
    saveStoredCars([CARS[0]!]);
    const fetch = vi
      .fn()
      .mockResolvedValue(json({ ok: false, conflict: true, currentRevision: 5 }, 409));
    vi.stubGlobal("fetch", fetch);
    expect((await syncToServer()).conflict).toBe(true);
    expect(getStoredCars()[0]!.id).toBe(CARS[0]!.id);
    expect(getStoredCmsRevision()).toBe(4);
    expect(hasUnsavedCmsChanges()).toBe(true);
    await syncFromServer();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("serializes saves and uses the acknowledged revision for the next request", async () => {
    setStoredCmsRevision(7);
    let finish!: (response: Response) => void;
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(json({ ok: true, source: "d1", revision: 9 }));
    vi.stubGlobal("fetch", fetch);
    const first = syncToServer({ cars: [CARS[0]!] });
    await Promise.resolve();
    const second = syncToServer({ cars: [CARS[1]!] });
    expect(fetch).toHaveBeenCalledTimes(1);
    finish(json({ ok: true, source: "d1", revision: 8 }));
    await Promise.all([first, second]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[0]![1].body).revision).toBe(7);
    expect(JSON.parse(fetch.mock.calls[1]![1].body).revision).toBe(8);
  });

  it("never shows administrator drafts to public visitors or lets language changes replace SSR data", async () => {
    const privateCar = { ...CARS[0]!, title: "Unpublished edit" };
    saveStoredCars([privateCar]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { result } = renderHook(() => useByCarStore({ cars: [CARS[1]!] }));
    await act(async () => {
      result.current.setLang("en");
    });
    expect(result.current.cars).toEqual([CARS[1]!]);
    expect(result.current.inquiries).toEqual([]);
    expect(getPendingDeletedCarIds()).toEqual([]);
  });

  it("deletes the final car explicitly without requesting a whole catalog wipe", async () => {
    saveStoredCars([CARS[0]!]);
    const fetch = vi.fn().mockResolvedValue(json({ ok: true, source: "d1", revision: 2 }));
    vi.stubGlobal("fetch", fetch);
    deleteStoredCar(CARS[0]!.id, "Remove final car", false);
    await syncToServer();
    const payload = JSON.parse(fetch.mock.calls[0]![1].body);
    expect(payload.deletedCarIds).toEqual([CARS[0]!.id]);
    expect(payload.cars).toBeUndefined();
    expect(payload.allowEmptyCatalog).toBeUndefined();
    expect(getStoredCars()).toEqual([]);
  });

  it("undoing a newly added vehicle queues its server deletion", () => {
    saveStoredCars([CARS[0]!]);
    saveUndoSnapshot("Before add");
    saveStoredCars([CARS[0]!, { ...CARS[1]!, id: "new-car" }]);
    restoreUndoSnapshot();
    expect(getPendingDeletedCarIds()).toContain("new-car");
    expect(getStoredCars().map((car) => car.id)).toEqual([CARS[0]!.id]);
  });

  it("exports safe UPSERT SQL without deleting inquiry relationships or fabricating R2 object keys", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec("PRAGMA foreign_keys = ON");
      const directory = path.resolve("drizzle");
      for (const name of readdirSync(directory)
        .filter((name) => name.endsWith(".sql"))
        .sort())
        db.exec(readFileSync(path.join(directory, name), "utf8"));
      const key = "vehicles/uploaded/real-object.png";
      saveStoredCars([
        { ...CARS[0]!, slug: "preserved-slug", images: [`/api/media/${encodeURIComponent(key)}`] },
      ]);
      db.exec(exportD1SqlDump());
      db.prepare(
        "INSERT INTO inquiries (id, type, vehicle_id, car_title, customer_name, phone, offer_or_budget) VALUES ('linked', 'Teklif', ?, 'Car', 'Client', '5551234567', 'Info')",
      ).run(CARS[0]!.id);
      db.exec(exportD1SqlDump());
      expect(
        db.prepare("SELECT vehicle_id FROM inquiries WHERE id = 'linked'").get(),
      ).toMatchObject({ vehicle_id: CARS[0]!.id });
      expect(db.prepare("SELECT r2_key FROM vehicle_images").get()).toMatchObject({ r2_key: key });
      expect(db.prepare("SELECT slug FROM vehicles").get()).toMatchObject({
        slug: "preserved-slug",
      });
    } finally {
      db.close();
    }
  });

  it("rejects malformed JSON backups before modifying any draft", () => {
    saveStoredCars([CARS[0]!]);
    expect(importDatabaseJSON(JSON.stringify({ cars: [{ id: "broken" }] })).ok).toBe(false);
    expect(getStoredCars()[0]!.id).toBe(CARS[0]!.id);
  });

  it("keeps CRM data unchanged on status/delete errors and accepts only confirmed JSON", async () => {
    window.sessionStorage.setItem("bycar_admin_token", "test");
    const original = [{ id: "inquiry-1", name: "Test", status: "Yeni" }];
    window.sessionStorage.setItem("bycar_inquiries_v3", JSON.stringify(original));
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ error: "failed" }, 503))
      .mockResolvedValueOnce(new Response("<html>Sign in</html>"))
      .mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    await expect(updateInquiryOnServer("inquiry-1", "Tamamlandı")).rejects.toThrow();
    await expect(updateInquiryOnServer("inquiry-1")).rejects.toThrow();
    expect(getStoredInquiries()).toEqual(original);
    await updateInquiryOnServer("inquiry-1");
    expect(getStoredInquiries()).toEqual([]);
  });

  it("uses the explicit live contact number/template without reading an administrator draft", () => {
    const contact = {
      ...DEFAULT_CMS_CONFIG.contact,
      whatsapp: "+49 151 23456789",
      whatsappOfferTemplate: "VIP {car} / {car}",
    };
    const url = new URL(waLink("BMW M5", undefined, contact));
    expect(url.pathname).toBe("/4915123456789");
    expect(url.searchParams.get("text")).toBe("VIP BMW M5 / BMW M5");
    expect(
      renderContactTemplate("{model} ({year}) — {budget}", {
        model: "M5",
        year: "2026",
        budget: "100 EUR",
      }),
    ).toBe("M5 (2026) — 100 EUR");
  });

  it("keeps the last confirmed inbox and exposes refresh errors", async () => {
    window.sessionStorage.setItem(
      "bycar_inquiries_v3",
      JSON.stringify([{ id: "confirmed-inquiry" }]),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "Talepler okunamadı" }, 503)));
    await expect(syncInquiriesFromServer("token")).rejects.toThrow("Talepler okunamadı");
    expect(getStoredInquiries()).toEqual([{ id: "confirmed-inquiry" }]);
  });

  it("validates full default CMS and rejects malformed nested settings and executable URLs", () => {
    expect(CmsConfigSchema.safeParse(DEFAULT_CMS_CONFIG).success).toBe(true);
    expect(CmsConfigSchema.safeParse({ contact: "broken" }).success).toBe(false);
    expect(
      CmsConfigSchema.safeParse({ contact: { instagramUrl: "javascript:alert(1)" } }).success,
    ).toBe(false);
    expect(SettingsSchema.safeParse({ pinnedBrands: "BMW" }).success).toBe(false);
  });
});
