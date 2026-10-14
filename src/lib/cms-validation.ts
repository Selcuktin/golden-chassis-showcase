import { z } from "zod";

const text = z.string().max(20000);
const short = z.string().max(500);
// Only supported URL schemes. Relative media must stay on this origin.
export const mediaUrl = z
  .string()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
    try {
      return ["https:", "http:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Geçerli bir https bağlantısı veya / ile başlayan dosya yolu girin.");
const texts = (keys: string[]) => Object.fromEntries(keys.map((key) => [key, text]));
const entry = z.object({ id: short, titleTr: short, titleEn: short, descTr: text, descEn: text });
export const SettingsSchema = z
  .object({
    showSearchFilter: z.boolean(),
    showYearFilter: z.boolean(),
    showBodyFilter: z.boolean(),
    showFuelFilter: z.boolean(),
    showGearFilter: z.boolean(),
    showStatusFilter: z.boolean(),
    filterPanelDefaultOpen: z.boolean(),
    modalShowSpecsTab: z.boolean(),
    modalShowExtrasTab: z.boolean(),
    modalShowOfferTab: z.boolean(),
    modalDefaultTab: z.enum(["specs", "extras", "offer"]),
    defaultCardFit: z.enum(["contain", "cover"]),
    whatsappAutoOpenOnForm: z.boolean(),
    pinnedBrands: z.array(short).max(100),
  })
  .partial();
export const CmsConfigSchema = z
  .object({
    contact: z
      .object({
        ...texts([
          "phone",
          "phoneDisplay",
          "whatsapp",
          "email",
          "address",
          "hoursTr",
          "hoursEn",
          "whatsappOfferTemplate",
          "whatsappImportTemplate",
        ]),
        mapsUrl: mediaUrl,
        instagramUrl: mediaUrl,
      })
      .partial(),
    hero: z
      .object({
        ...texts([
          "badgeTr",
          "badgeEn",
          "titleTr",
          "titleEn",
          "subtitleTr",
          "subtitleEn",
          "primaryBtnTextTr",
          "primaryBtnTextEn",
          "secondaryBtnTextTr",
          "secondaryBtnTextEn",
        ]),
        bgImage: mediaUrl,
      })
      .partial(),
    stats: z.array(z.object({ value: short, labelTr: short, labelEn: short })).max(30),
    customPresets: z
      .object({
        brands: z.array(short),
        packages: z.array(short),
        bodies: z.array(short),
        fuels: z.array(short),
        gears: z.array(short),
        powers: z.array(short),
        colors: z.array(short),
        expertises: z.array(short),
        tramers: z.array(short),
        extras: z.array(z.object({ tr: short, en: short })),
      })
      .partial(),
    about: z
      .object(
        texts([
          "headingTr",
          "headingEn",
          "storyTr",
          "storyEn",
          "highlightTr",
          "highlightEn",
          "sloganTr",
          "sloganEn",
        ]),
      )
      .partial(),
    services: z.array(entry).max(50),
    conciergeSteps: z
      .array(z.object({ step: short, titleTr: short, titleEn: short, descTr: text, descEn: text }))
      .max(50),
    testimonials: z
      .array(
        z.object({
          id: short,
          name: short,
          roleTr: short,
          roleEn: short,
          car: short,
          rating: z.number().min(0).max(5),
          commentTr: text,
          commentEn: text,
        }),
      )
      .max(100),
    faqs: z.array(z.object({ id: short, qTr: text, qEn: text, aTr: text, aEn: text })).max(100),
    sectionVisibility: z
      .object({
        showHeroStats: z.boolean(),
        showAbout: z.boolean(),
        showServices: z.boolean(),
        showConcierge: z.boolean(),
        showTestimonials: z.boolean(),
        showFaq: z.boolean(),
        showFloatingWhatsapp: z.boolean(),
      })
      .partial(),
    legal: z
      .object(
        texts(["kvkkTr", "kvkkEn", "privacyTr", "privacyEn", "cookieBannerTr", "cookieBannerEn"]),
      )
      .partial(),
    seo: z.object(texts(["metaTitleTr", "metaTitleEn", "metaDescTr", "metaDescEn"])).partial(),
  })
  .partial();

export const VehicleSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(150)
      .regex(/^[^/\\?#<>]+$/)
      .optional(),
    brand: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(150),
    year: z.number().int().min(1900).max(2100),
    km: z.number().int().min(0),
    fuel: z.string().trim().min(1).max(50),
    gear: z.string().trim().min(1).max(50),
    body: z.string().trim().min(1).max(50),
    specs: z
      .object({
        power: z.string().default(""),
        color: z.string().default(""),
        package: z.string().default(""),
        expertise: z.string().default(""),
        tramer: z.string().default("Yok"),
      })
      .default({}),
    imageFit: z.enum(["contain", "cover"]).default("cover"),
    video: mediaUrl.optional(),
    images: z.array(mediaUrl).max(50).default([]),
    extras: z.array(z.string()).default([]),
    extrasEn: z.array(z.string()).default([]),
    description: z
      .object({
        tr: z.string().default(""),
        en: z.string().default(""),
      })
      .default({ tr: "", en: "" }),
    status: z.enum(["active", "sold", "draft"]).optional(),
    sold: z.boolean().optional(),
    featured: z.boolean().default(false),
  })
  .transform((car) => ({ ...car, status: car.status || (car.sold ? "sold" : "active") }));

export const CatalogBackupSchema = z.object({
  cars: z.array(VehicleSchema).min(1).max(35),
  settings: SettingsSchema.optional(),
  cmsConfig: CmsConfigSchema.optional(),
});
