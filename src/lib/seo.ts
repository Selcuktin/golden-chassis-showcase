import type { Car, SiteCMSConfig } from "./bycar";

export const SITE_NAME = "ByCar Etiler";
export const HOME_TITLE = "ByCar Etiler | Lüks Otomobil ve Özel Araç Tedariki";
export const HOME_DESCRIPTION =
  "ByCar Etiler lüks ve süper spor otomobil koleksiyonunu inceleyin. Araçların donanım, kilometre ve durum bilgilerini görün; güncel fiyat ve özel tedarik için bize ulaşın.";

export function absoluteUrl(path: string, origin: string): string {
  return new URL(path, `${origin.replace(/\/+$/, "")}/`).href;
}

export function homeSeo(config?: SiteCMSConfig | null) {
  return {
    title: config?.seo?.metaTitleTr?.trim() || HOME_TITLE,
    description: config?.seo?.metaDescTr?.trim() || HOME_DESCRIPTION,
  };
}

export function vehicleSeo(car: Car) {
  const sold = car.sold || car.status === "sold";
  const detail = [
    `${car.year} ${car.title}`,
    `${car.km.toLocaleString("tr-TR")} km`,
    car.fuel,
    car.gear,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    title: `${car.year} ${car.title}${sold ? " (Satıldı)" : ""} | ${SITE_NAME}`,
    description: `${detail}. ${sold ? "Satılmış araç arşivi. Güncel koleksiyon için bize ulaşın." : "Donanım ve fotoğrafları inceleyin; güncel fiyat için ByCar Etiler ile iletişime geçin."}`,
  };
}

function carEntity(car: Car, origin: string) {
  const url = absoluteUrl(`/arac/${encodeURIComponent(car.slug || car.id)}`, origin);
  return {
    "@type": "Car",
    "@id": `${url}#vehicle`,
    url,
    name: `${car.year} ${car.title}`,
    description: car.description?.tr || vehicleSeo(car).description,
    brand: { "@type": "Brand", name: car.brand },
    model: car.title,
    vehicleModelDate: String(car.year),
    bodyType: car.body,
    fuelType: car.fuel,
    vehicleTransmission: car.gear,
    color: car.specs.color,
    image: car.images.map((image) => absoluteUrl(image, origin)),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: car.km, unitCode: "KMT" },
    offers: {
      "@type": "Offer",
      url,
      availability:
        car.sold || car.status === "sold"
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
      seller: { "@id": absoluteUrl("/#dealership", origin) },
    },
  };
}

export function homeStructuredData(cars: Car[], config: SiteCMSConfig, origin: string) {
  const published = cars.filter((car) => car.status !== "draft");
  const url = absoluteUrl("/", origin);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AutoDealer",
        "@id": `${url}#dealership`,
        name: SITE_NAME,
        url,
        logo: absoluteUrl("/bycar-logo-dark.webp", origin),
        image: absoluteUrl("/hero.webp", origin),
        description: homeSeo(config).description,
        telephone: config.contact.phone,
        ...(config.contact.email ? { email: config.contact.email } : {}),
        ...(config.contact.address ? { address: config.contact.address } : {}),
        ...(config.contact.mapsUrl ? { hasMap: config.contact.mapsUrl } : {}),
        sameAs: config.contact.instagramUrl ? [config.contact.instagramUrl] : [],
      },
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        url,
        name: SITE_NAME,
        inLanguage: "tr-TR",
        publisher: { "@id": `${url}#dealership` },
      },
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        url,
        name: homeSeo(config).title,
        description: homeSeo(config).description,
        inLanguage: "tr-TR",
        isPartOf: { "@id": `${url}#website` },
        about: { "@id": `${url}#dealership` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: published.length,
          itemListElement: published.map((car, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: carEntity(car, origin),
          })),
        },
      },
    ],
  };
}

export function vehicleStructuredData(car: Car, origin: string) {
  const entity = carEntity(car, origin);
  return {
    "@context": "https://schema.org",
    "@graph": [
      entity,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/", origin) },
          { "@type": "ListItem", position: 2, name: `${car.year} ${car.title}`, item: entity.url },
        ],
      },
    ],
  };
}
