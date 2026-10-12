import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { CARS, T } from "@/lib/bycar";

describe("App routing & ByCar data integrity", () => {
  it("matches a page for / and /admin instead of falling back to not found", () => {
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
    });

    const homeMatches = router.matchRoutes("/");
    const adminMatches = router.matchRoutes("/admin");

    expect(homeMatches.at(-1)?.routeId).not.toBe(rootRouteId);
    expect(adminMatches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("ensures all 10 gallery vehicles have >= 4 unique multi-angle photos and no prices", () => {
    expect(CARS.length).toBeGreaterThanOrEqual(10);
    expect(CARS[0].id).toBe("cupra-formentor-2023");
    expect(CARS[0].video).toBe("/cars/cupra/video.mp4");
    expect(CARS[1].id).toBe("audi-q2-design-2016");
    expect(CARS[1].images.length).toBe(8);

    for (const car of CARS) {
      expect(car.images.length).toBeGreaterThanOrEqual(4);
      const uniqueImages = new Set(car.images);
      expect(uniqueImages.size).toBe(car.images.length);
      expect("price" in car).toBe(false);
    }
  });

  it("provides complete bilingual TR and EN translations for Vision, FAQ, and KVKK", () => {
    expect(T.tr.faqs.length).toBe(5);
    expect(T.en.faqs.length).toBe(5);
    expect(T.tr.founderParagraphs.length).toBeGreaterThanOrEqual(3);
    expect(T.en.founderParagraphs.length).toBeGreaterThanOrEqual(3);
    expect(T.tr.kvkkBody.length).toBeGreaterThanOrEqual(4);
    expect(T.en.kvkkBody.length).toBeGreaterThanOrEqual(4);
  });
});
