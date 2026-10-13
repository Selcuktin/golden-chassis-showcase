import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import {
  ADMIN_PRESETS,
  CARS,
  type Car,
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
    const car0 = CARS[0]!;
    const car1 = CARS[1]!;
    expect(car0.id).toBe("cupra-formentor-2023");
    expect(car0.imageFit).toBe("contain");
    expect(car0.video).toBe("/cars/cupra/video.mp4");
    expect(car1.id).toBe("audi-q2-design-2016");
    expect(car1.images.length).toBe(8);

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

    expect(await verifyAdminPasswordPBKDF2("bybycar1453")).toBe(true);
    expect(await verifyAdminPasswordPBKDF2("invalid-legacy-password")).toBe(false);
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
    const car0 = CARS[0]!;
    const customCar: Car = {
      ...car0,
      id: "custom-shooting-brake-2026",
      body: "Özel Shooting Brake GT",
      fuel: "Hidrojen / E-Fuel",
      gear: "9G-Tronic Speedshift",
    };
    saveStoredCars([customCar, ...CARS], "Özel araç eklendi");
    expect(getStoredCars()[0]!.body).toBe("Özel Shooting Brake GT");

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
    expect(getStoredCars()[0]!.id).toBe("custom-shooting-brake-2026");

    // Reset back to default CARS
    saveStoredCars(CARS, "Test temizliği");
  });

  it("Phase 8: enables 100% zero-code admin CMS config, dynamic presets, custom PBKDF2 password, and Cloudflare D1 synchronization", async () => {
    const {
      getStoredCmsConfig,
      saveStoredCmsConfig,
      resetStoredCmsConfig,
      getEffectivePresets,
      setCustomAdminPassword,
      exportD1SqlDump,
      exportDatabaseJSON,
      importDatabaseJSON,
    } = await import("@/lib/bycar");

    // 1. Initial CMS config integrity
    const initialConfig = getStoredCmsConfig();
    expect(initialConfig.contact.phone).toBe("+90 540 061 16 34");
    expect(initialConfig.hero.badgeTr).toBe("BYCAR EXCLUSIVE SHOWROOM");
    expect(initialConfig.stats.length).toBe(4);
    expect(initialConfig.services.length).toBe(4);
    expect(initialConfig.conciergeSteps.length).toBe(4);
    expect(initialConfig.testimonials.length).toBeGreaterThanOrEqual(3);
    expect(initialConfig.faqs.length).toBeGreaterThanOrEqual(5);
    expect(initialConfig.sectionVisibility.showHeroStats).toBe(true);

    // 2. Custom Presets chip addition & deletion
    const presetsBefore = getEffectivePresets();
    const updatedConfig = {
      ...initialConfig,
      customPresets: {
        ...initialConfig.customPresets,
        brands: [...initialConfig.customPresets.brands, "Koenigsegg"],
        fuels: [...initialConfig.customPresets.fuels, "E-Fuel Sentetik"],
      },
    };
    saveStoredCmsConfig(updatedConfig, "Koenigsegg ve E-Fuel eklendi");

    const presetsAfter = getEffectivePresets();
    expect(presetsAfter.brands).toContain("Koenigsegg");
    expect(presetsAfter.fuels).toContain("E-Fuel Sentetik");
    expect(presetsAfter.brands.length).toBe(presetsBefore.brands.length + 1);

    // 3. Custom Admin Password Change via PBKDF2
    const customPass = "SuperVIP_2026!#";
    await setCustomAdminPassword(customPass);
    expect(await verifyAdminPasswordPBKDF2(customPass)).toBe(true);
    // Default master password should still work as fallback
    expect(await verifyAdminPasswordPBKDF2("bybycar1453")).toBe(true);
    expect(await verifyAdminPasswordPBKDF2("wrong-custom-pass")).toBe(false);

    // 4. Cloudflare D1 SQL Dump and JSON export contains updated CMS config
    const d1Sql = exportD1SqlDump();
    expect(d1Sql).toContain("cms_config");
    expect(d1Sql).toContain("Koenigsegg");

    const jsonBackup = exportDatabaseJSON();
    expect(jsonBackup).toContain("Koenigsegg");
    expect(jsonBackup).toContain("cmsConfig");

    // 5. Reset CMS config to factory defaults
    resetStoredCmsConfig();
    const resetCfg = getStoredCmsConfig();
    expect(resetCfg.customPresets.brands).not.toContain("Koenigsegg");
    expect(resetCfg.customPasswordHash).toBeNull();
  });
});
