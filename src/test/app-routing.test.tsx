import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import {
  ADMIN_PRESETS,
  CARS,
  T,
  exportD1SqlDump,
  exportDatabaseJSON,
  getStoredCars,
  importDatabaseJSON,
  recordLoginAttempt,
  restoreUndoSnapshot,
  saveStoredCars,
  translateTerm,
  verifyAdminPasswordPBKDF2,
} from "@/lib/bycar";

describe("App routing & ByCar Phase 6 Convergence integrity", () => {
  it("matches routes for /, /admin, and /arac/:slug", () => {
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
    });

    const homeMatches = router.matchRoutes("/");
    const adminMatches = router.matchRoutes("/admin");
    const carMatches = router.matchRoutes("/arac/cupra-formentor-2023");

    expect(homeMatches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(adminMatches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(carMatches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("ensures all 10 gallery vehicles have >= 4 unique multi-angle photos, bilingual extrasEn, and no prices", () => {
    expect(CARS.length).toBeGreaterThanOrEqual(10);
    expect(CARS[0].id).toBe("cupra-formentor-2023");
    expect(CARS[0].imageFit).toBe("contain");
    expect(CARS[0].video).toBe("/cars/cupra/video.mp4");
    expect(CARS[1].id).toBe("audi-q2-design-2016");
    expect(CARS[1].images.length).toBe(8);

    for (const car of CARS) {
      expect(car.images.length).toBeGreaterThanOrEqual(4);
      const uniqueImages = new Set(car.images);
      expect(uniqueImages.size).toBe(car.images.length);
      expect(car.extrasEn?.length).toBeGreaterThan(0);
      expect("price" in car).toBe(false);
    }
  });

  it("provides complete bilingual TR/EN translations, unrestricted presets, PBKDF2 + Brute-Force security, and DB Undo/Export", async () => {
    expect(T.tr.faqs.length).toBe(5);
    expect(T.en.faqs.length).toBe(5);
    expect(translateTerm("Benzin", "en")).toBe("Petrol");
    expect(translateTerm("Otomatik", "en")).toBe("Automatic");
    expect(translateTerm("Station Wagon / Avant", "en")).toBe("Station Wagon / Avant");
    expect(ADMIN_PRESETS.extras.length).toBeGreaterThanOrEqual(20);
    expect(ADMIN_PRESETS.bodies.length).toBeGreaterThanOrEqual(10);
    expect(ADMIN_PRESETS.fuels.length).toBeGreaterThanOrEqual(6);
    expect(ADMIN_PRESETS.gears.length).toBeGreaterThanOrEqual(5);

    expect(await verifyAdminPasswordPBKDF2("bycar2024")).toBe(true);
    expect(await verifyAdminPasswordPBKDF2("bycar2026")).toBe(true);
    expect(await verifyAdminPasswordPBKDF2("wrong-pass")).toBe(false);

    recordLoginAttempt(true); // reset
    for (let i = 0; i < 4; i++) {
      expect(recordLoginAttempt(false).lockedUntil).toBeNull();
    }
    const fifth = recordLoginAttempt(false);
    expect(fifth.attempts).toBe(5);
    expect(fifth.lockedUntil).not.toBeNull();
    recordLoginAttempt(true); // clean up

    // Test unrestricted custom body/fuel/gear persistence + Undo + JSON/SQL export
    const customCar = {
      ...CARS[0],
      id: "custom-shooting-brake-2026",
      body: "Özel Shooting Brake GT",
      fuel: "Hidrojen / E-Fuel",
      gear: "9G-Tronic Speedshift",
    };
    saveStoredCars([customCar, ...CARS], "Özel araç eklendi");
    expect(getStoredCars()[0].body).toBe("Özel Shooting Brake GT");

    const jsonBackup = exportDatabaseJSON();
    expect(jsonBackup).toContain("Özel Shooting Brake GT");

    const sqlDump = exportD1SqlDump();
    expect(sqlDump).toContain("INSERT OR REPLACE INTO vehicles");
    expect(sqlDump).toContain("Özel Shooting Brake GT");

    const restored = restoreUndoSnapshot();
    expect(restored).not.toBeNull();
    expect(getStoredCars().length).toBe(CARS.length);

    const importRes = importDatabaseJSON(jsonBackup);
    expect(importRes.ok).toBe(true);
    expect(getStoredCars()[0].id).toBe("custom-shooting-brake-2026");

    // Reset back to default CARS
    saveStoredCars(CARS, "Test temizliği");
  });
});

