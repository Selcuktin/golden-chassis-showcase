import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CARS } from "../lib/bycar";
import { ImageLightboxModal } from "../components/ImageLightboxModal";

describe("ByCar Fleet & ImageLightboxModal Verification", () => {
  it("fleet has at least 10 cars and all are active", () => {
    expect(CARS.length).toBeGreaterThanOrEqual(10);
    const activeCars = CARS.filter((c) => c.status === "active");
    expect(activeCars.length).toBe(15);

    // Each car must have at least 4 angle images
    for (const car of CARS) {
      expect(car.images.length).toBeGreaterThanOrEqual(4);
      for (const img of car.images) {
        expect(img).toMatch(/^\/cars\//);
      }
    }
  });

  it("renders ImageLightboxModal and navigates images with arrows", () => {
    const images = [
      "/cars/cupra-formentor/1.jpg",
      "/cars/cupra-formentor/2.jpg",
      "/cars/cupra-formentor/3.jpg",
    ];
    const onClose = vi.fn();

    const { rerender } = render(
      <ImageLightboxModal
        isOpen={true}
        onClose={onClose}
        images={images}
        initialIndex={0}
        title="2023 Cupra Formentor"
      />,
    );

    // Checks title and initial counter
    expect(screen.getByText("2023 Cupra Formentor")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    // Click next arrow
    const nextBtn = screen.getByLabelText("Sonraki Fotoğraf");
    fireEvent.click(nextBtn);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    // Click previous arrow
    const prevBtn = screen.getByLabelText("Önceki Fotoğraf");
    fireEvent.click(prevBtn);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    // Click close button
    const closeBtn = screen.getByLabelText("Kapat");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Re-render closed
    rerender(
      <ImageLightboxModal isOpen={false} onClose={onClose} images={images} initialIndex={0} />,
    );
    expect(screen.queryByText("1 / 3")).not.toBeInTheDocument();
  });

  it("Regression Test 1: Active car in cars list is NEVER purged if accidentally present in pendingDeletedCarIds", async () => {
    const { queueDeletedCarId, getPendingDeletedCarIds, clearPendingDeletedCarIds, syncToServer } =
      await import("../lib/bycar");

    let sentPayload: { deletedCarIds?: string[] } | null = null;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/cms" && init?.method === "POST" && typeof init.body === "string") {
        sentPayload = JSON.parse(init.body);
        return new Response(JSON.stringify({ ok: true, source: "d1", revision: 2 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return originalFetch(url, init);
    });

    try {
      queueDeletedCarId("car-active-1");
      queueDeletedCarId("car-really-dead");
      expect(getPendingDeletedCarIds()).toEqual(["car-active-1", "car-really-dead"]);

      const mockCars = [
        {
          id: "car-active-1",
          brand: "Porsche",
          title: "Porsche 911",
          year: 2024,
          km: 1000,
          fuel: "Benzin",
          gear: "PDK",
          body: "Coupe",
          status: "active" as const,
          featured: true,
          imageFit: "cover" as const,
          images: [],
          specs: {
            power: "650 HP",
            color: "Gri",
            package: "Turbo S",
            expertise: "Orijinal",
            tramer: "Yok",
          },
          extras: [],
          extrasEn: [],
          description: { tr: "", en: "" },
        },
      ];

      await syncToServer({ cars: mockCars });

      expect(sentPayload).not.toBeNull();
      const payloadObj = sentPayload as unknown as { deletedCarIds?: string[] };
      expect(payloadObj.deletedCarIds).toEqual(["car-really-dead"]);
      expect(payloadObj.deletedCarIds).not.toContain("car-active-1");
    } finally {
      globalThis.fetch = originalFetch;
      clearPendingDeletedCarIds();
    }
  });

  it("Regression Test 2: Full Delete -> Undo -> Delete again lifecycle restores vehicle and clears deletion queue", async () => {
    const {
      saveUndoSnapshot,
      restoreUndoSnapshot,
      getUndoSnapshot,
      queueDeletedCarId,
      getPendingDeletedCarIds,
      clearAllBrowserStorage,
    } = await import("../lib/bycar");

    clearAllBrowserStorage();
    const testCar = CARS[0]!;

    // 1. Initial State: Save Undo Snapshot
    saveUndoSnapshot("Snapshot Before Delete");
    expect(getUndoSnapshot()).not.toBeNull();

    // 2. User deletes the car
    queueDeletedCarId(testCar.id);
    expect(getPendingDeletedCarIds()).toContain(testCar.id);

    // 3. User clicks Undo
    const restored = restoreUndoSnapshot();
    expect(restored).not.toBeNull();
    // After restore, the car is restored and its ID is removed from pending deleted list!
    expect(getPendingDeletedCarIds()).not.toContain(testCar.id);

    // 4. User deletes the car again
    queueDeletedCarId(testCar.id);
    expect(getPendingDeletedCarIds()).toContain(testCar.id);
    clearAllBrowserStorage();
  });
});
