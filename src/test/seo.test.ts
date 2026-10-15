import { describe, expect, it } from "vitest";
import { CARS, DEFAULT_CMS_CONFIG } from "../lib/bycar";
import {
  absoluteUrl,
  homeSeo,
  homeStructuredData,
  vehicleSeo,
  vehicleStructuredData,
} from "../lib/seo";
import { handleApiRequest } from "../server/api";

describe("Canonical brand and search visibility", () => {
  const origin = "https://bycaretiler.com";
  const car = CARS[0]!;

  it("lets search crawlers retrieve public media while excluding private endpoints", async () => {
    const response = await handleApiRequest(new Request(`${origin}/robots.txt`), {
      SITE_URL: origin,
    });
    const robots = await response!.text();
    expect(robots).toContain("Allow: /api/media/");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Disallow: /_serverFn/");
    expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
    // No crawler-specific group that accidentally loses the private-path exclusions.
    expect(robots.match(/User-agent:/g)).toHaveLength(1);
  });

  it("uses CMS metadata consistently and provides branded fallbacks", () => {
    expect(homeSeo().title).toContain("ByCar Etiler");
    expect(
      homeSeo({
        ...DEFAULT_CMS_CONFIG,
        seo: { ...DEFAULT_CMS_CONFIG.seo, metaTitleTr: "Özel başlık" },
      }).title,
    ).toBe("Özel başlık");
    expect(absoluteUrl("/hero.webp", `${origin}/`)).toBe(`${origin}/hero.webp`);
    expect(absoluteUrl("https://images.example/photo.webp", origin)).toBe(
      "https://images.example/photo.webp",
    );
  });

  it("describes only published cars, preserves sold status and never invents prices or ratings", () => {
    const schema = homeStructuredData(
      [
        car,
        { ...car, id: "draft", slug: "draft", status: "draft" },
        { ...car, id: "sold", slug: "sold", status: "sold" },
      ],
      DEFAULT_CMS_CONFIG,
      origin,
    );
    const text = JSON.stringify(schema);
    expect(text).not.toContain("/arac/draft");
    expect(text).toContain("https://schema.org/SoldOut");
    expect(text).not.toContain('"price"');
    expect(text).not.toContain("aggregateRating");
    expect(text).not.toContain("ByCar Global");
    expect(text).toContain(`${origin}/#dealership`);
    expect(text).toContain('"vehicleModelDate"');
    expect(text).not.toContain('"modelDate"');
    expect(schema["@graph"][0]).toMatchObject({
      name: "ByCar Etiler",
      address: DEFAULT_CMS_CONFIG.contact.address,
    });
  });

  it("gives sold vehicles truthful titles and canonical breadcrumbs", () => {
    const sold = { ...car, status: "sold" as const };
    expect(vehicleSeo(sold).title).toContain("(Satıldı)");
    expect(vehicleSeo(sold).description).toContain("Satılmış araç arşivi");
    const schema = vehicleStructuredData(sold, origin);
    expect(schema["@graph"][1]).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { item: `${origin}/` },
        { item: `${origin}/arac/${encodeURIComponent(car.slug || car.id)}` },
      ],
    });
  });
});
