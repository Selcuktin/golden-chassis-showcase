import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Phone,
  Play,
  Share2,
  ZoomIn,
} from "lucide-react";
import { ImageLightboxModal } from "../components/ImageLightboxModal";
import {
  CARS,
  PHONE_RAW,
  T,
  getStoredCars,
  translateTerm,
  useByCarStore,
  waLink,
  type Lang,
} from "@/lib/bycar";
import { QuickOfferForm } from "./index";

export const Route = createFileRoute("/arac/$slug")({
  loader: ({ params }) => {
    const pool = typeof window !== "undefined" ? getStoredCars() : CARS;
    const found =
      pool.find((c) => c.id === params.slug && c.status !== "draft") ||
      CARS.find((c) => c.id === params.slug && c.status !== "draft");
    if (!found) {
      throw notFound();
    }
    return { car: found };
  },
  notFoundComponent: VehicleNotFoundPage,
  head: ({ loaderData }) => {
    const found = loaderData?.car;
    if (!found) {
      return {
        meta: [
          { title: "Araç Bulunamadı (404) — ByCar Global" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }
    const rawImage = found.images[0] || "/hero.png";
    const ogImage = rawImage.startsWith("http")
      ? rawImage
      : `https://bycarglobal.com${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;

    return {
      meta: [
        { title: `${found.year} ${found.title} | ByCar — Exclusive Automotive` },
        {
          name: "description",
          content:
            found.description?.tr ||
            `${found.year} ${found.title} — ${found.specs.power}, ${found.specs.expertise}. ByCar Global VIP Koleksiyonu.`,
        },
        { property: "og:title", content: `${found.year} ${found.title} — ByCar Global` },
        {
          property: "og:description",
          content: `${found.specs.power} · ${found.km.toLocaleString("tr-TR")} KM · ${found.specs.expertise}`,
        },
        { property: "og:image", content: ogImage },
        { property: "og:url", content: `https://bycarglobal.com/arac/${found.id}` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImage },
      ],
    };
  },
  component: VehicleDetailPage,
});

function VehicleNotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <p className="mb-2 text-xs uppercase tracking-[0.4em] text-primary">
        HTTP 404 · BYCAR GLOBAL
      </p>
      <h1 className="font-display text-4xl font-semibold md:text-6xl">Araç Bulunamadı</h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground">
        Aradığınız araç koleksiyondan kaldırılmış, taslağa alınmış veya satılmış olabilir.
      </p>
      <Link
        to="/"
        hash="koleksiyon"
        className="mt-8 inline-flex items-center gap-2 bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-gold"
      >
        <ArrowLeft className="h-4 w-4" />
        Koleksiyona Dön
      </Link>
    </div>
  );
}

function VehicleDetailPage() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const { cars, settings, cmsConfig, lang, setLang } = useByCarStore();
  const t = T[lang];
  const [img, setImg] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const car = cars.find((c) => c.id === slug && c.status !== "draft") || loaderData?.car;

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = car
        ? `${car.year} ${car.title} | ByCar — Exclusive Automotive`
        : "Araç Bulunamadı (404) — ByCar Global";
    }
  }, [car]);

  if (!car) {
    return <VehicleNotFoundPage />;
  }

  const isSold = Boolean(car.sold || car.status === "sold");
  const localizedExtras =
    lang === "en" && car.extrasEn && car.extrasEn.length > 0
      ? car.extrasEn
      : (car.extras || []).map((item) => translateTerm(item, lang));

  const absoluteImages = car.images.map((im) =>
    im.startsWith("http") ? im : `https://bycarglobal.com${im.startsWith("/") ? "" : "/"}${im}`,
  );

  const carJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${car.year} ${car.title}`,
    brand: { "@type": "Brand", name: car.brand },
    model: car.title,
    vehicleModelDate: car.year,
    bodyType: car.body,
    fuelType: car.fuel,
    vehicleTransmission: car.gear,
    color: car.specs.color,
    image: absoluteImages,
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: car.km,
      unitCode: "KMT",
    },
    offers: {
      "@type": "Offer",
      url: `https://bycarglobal.com/arac/${car.id}`,
      availability: isSold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    },
  });

  const prevImg = () => {
    setShowVideo(false);
    setImg((prev) => (prev === 0 ? car.images.length - 1 : prev - 1));
  };
  const nextImg = () => {
    setShowVideo(false);
    setImg((prev) => (prev === car.images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: carJsonLd }} />

      {/* Top Bar */}
      <header className="border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link
            to="/"
            hash="koleksiyon"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {lang === "tr" ? "Koleksiyona Dön" : "Back to Collection"}
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex border border-border text-xs">
              {(["tr", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`cursor-pointer px-2.5 py-1 uppercase transition ${
                    lang === l
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10 pb-28 lg:pb-12">
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-12 min-w-0">
          {/* Left: Multi-Angle Gallery & Desktop Offer Form (lg:col-span-7) */}
          <div className="min-w-0 lg:col-span-7 flex flex-col">
            {/* Main Media Viewer - Enlarged Aspect Ratio */}
            <div className="relative mb-2.5 overflow-hidden border border-border bg-black">
              {showVideo && car.video ? (
                <video
                  src={car.video}
                  controls
                  autoPlay
                  className="aspect-[16/9] w-full bg-black object-contain"
                />
              ) : (
                <div
                  onClick={() => setLightboxOpen(true)}
                  className="relative aspect-[16/9] w-full overflow-hidden cursor-zoom-in group select-none"
                >
                  {car.imageFit === "contain" ? (
                    <>
                      <div
                        className="absolute inset-0 h-full w-full scale-125 bg-cover bg-center opacity-65 blur-xl brightness-75"
                        style={{ backgroundImage: `url(${car.images[img]})` }}
                      />
                      <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
                      <img
                        src={car.images[img]}
                        alt={`${car.title} - ${img + 1}`}
                        className="relative z-10 h-full w-full object-contain p-1"
                      />
                    </>
                  ) : (
                    <img
                      src={car.images[img]}
                      alt={`${car.title} - ${img + 1}`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}

                  {/* Zoom Badge Trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxOpen(true);
                    }}
                    aria-label="Tam Ekran Büyüt"
                    className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full border border-white/20 bg-black/75 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-md transition hover:border-primary hover:text-primary active:scale-95 cursor-pointer shadow-lg"
                  >
                    <ZoomIn className="h-3 w-3 text-primary" />
                    <span>{lang === "tr" ? "Büyüt" : "Zoom"}</span>
                  </button>
                </div>
              )}

              {!showVideo && car.images.length > 1 && (
                <>
                  <button
                    onClick={prevImg}
                    aria-label="Önceki Açı"
                    className="absolute left-3 top-1/2 z-20 -translate-y-1/2 cursor-pointer border border-border bg-background/80 p-2 text-foreground hover:border-primary hover:text-primary active:scale-95 transition"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImg}
                    aria-label="Sonraki Açı"
                    className="absolute right-3 top-1/2 z-20 -translate-y-1/2 cursor-pointer border border-border bg-background/80 p-2 text-foreground hover:border-primary hover:text-primary active:scale-95 transition"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Compact Multi-Angle Thumbnail Strip */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1.5">
              {car.images.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setShowVideo(false);
                    setImg(i);
                  }}
                  className={`w-16 sm:w-20 shrink-0 cursor-pointer border-2 transition ${
                    !showVideo && i === img
                      ? "border-primary opacity-100"
                      : "border-transparent opacity-55 hover:opacity-90"
                  }`}
                >
                  <img src={s} alt="" className="aspect-video w-full object-cover" />
                </button>
              ))}
              {car.video && (
                <button
                  onClick={() => setShowVideo(true)}
                  className={`flex w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-2 bg-card text-[10px] font-semibold uppercase ${
                    showVideo
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>{lang === "tr" ? "VİDEO" : "VIDEO"}</span>
                </button>
              )}
            </div>

            {/* Desktop Only: Quick Offer Form under Gallery to balance empty space */}
            {!isSold && (
              <div className="mt-4 hidden lg:block border border-border bg-card p-4">
                <h2 className="mb-2.5 font-display text-base font-semibold">{t.form}</h2>
                <QuickOfferForm
                  carTitle={car.title}
                  t={t}
                  lang={lang}
                  autoWhatsApp={settings.whatsappAutoOpenOnForm}
                />
              </div>
            )}
          </div>

          {/* Right: Specs & Action Buttons (lg:col-span-5) */}
          <div className="min-w-0 lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.35em] text-primary">{car.brand}</p>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {copied
                    ? lang === "tr"
                      ? "Kopyalandı"
                      : "Copied"
                    : lang === "tr"
                      ? "Linki Kopyala"
                      : "Copy Link"}
                </button>
              </div>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold md:text-4xl">
                {car.title}
              </h1>

              <div className="my-3 flex flex-wrap gap-1.5 text-xs uppercase">
                <span className="border border-border bg-card px-2.5 py-0.5">{car.year}</span>
                <span className="border border-border bg-card px-2.5 py-0.5">
                  {car.km.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")} KM
                </span>
                <span className="border border-border bg-card px-2.5 py-0.5">
                  {translateTerm(car.fuel, lang)}
                </span>
                <span className="border border-border bg-card px-2.5 py-0.5">
                  {translateTerm(car.gear, lang)}
                </span>
                <span className="border border-border bg-card px-2.5 py-0.5">{car.body}</span>
              </div>

              {car.description && (
                <p className="mb-4 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  {car.description[lang]}
                </p>
              )}

              <div className="mb-4 border border-border bg-card p-3.5 text-xs sm:text-sm">
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">
                    {lang === "tr" ? "Motor Gücü" : "Engine Power"}
                  </span>
                  <span className="font-medium">{translateTerm(car.specs.power, lang)}</span>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">
                    {lang === "tr" ? "Dış / İç Renk" : "Color"}
                  </span>
                  <span className="font-medium">{translateTerm(car.specs.color, lang)}</span>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">
                    {lang === "tr" ? "Donanım / Paket" : "Package"}
                  </span>
                  <span className="font-medium">{translateTerm(car.specs.package, lang)}</span>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">
                    {lang === "tr" ? "Ekspertiz" : "Inspection"}
                  </span>
                  <span className="text-right font-medium">
                    {translateTerm(car.specs.expertise, lang)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">
                    {lang === "tr" ? "Tramer" : "Damage Record"}
                  </span>
                  <span className="font-medium">{translateTerm(car.specs.tramer, lang)}</span>
                </div>
              </div>

              {!isSold && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <a
                      href={waLink(car.title)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-gold px-4 py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-gold"
                    >
                      <MessageCircle className="h-4 w-4" /> {t.waQuote}
                    </a>
                    <a
                      href={`tel:${cmsConfig.contact.phone.replace(/\s+/g, "")}`}
                      className="inline-flex items-center justify-center gap-2 border border-primary px-4 py-3 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Phone className="h-4 w-4" /> {t.call}
                    </a>
                  </div>

                  {/* Mobile Only: Quick Offer Form */}
                  <div className="block lg:hidden border border-border bg-card p-4">
                    <h2 className="mb-2.5 font-display text-base font-semibold">{t.form}</h2>
                    <QuickOfferForm
                      carTitle={car.title}
                      t={t}
                      lang={lang}
                      autoWhatsApp={settings.whatsappAutoOpenOnForm}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Equipment & Options Grid (Below Split View) */}
        {localizedExtras.length > 0 && (
          <div className="mt-8 border-t border-border pt-6">
            <h2 className="mb-4 font-display text-xl sm:text-2xl font-semibold">
              {lang === "tr"
                ? `Donanım & Opsiyonlar (${localizedExtras.length})`
                : `Equipment & Options (${localizedExtras.length})`}
            </h2>
            {/* Responsive Compact Grid: 2 tight columns on mobile (no long scroll!), 3 columns on desktop */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5 md:grid-cols-3">
              {localizedExtras.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-1.5 sm:gap-2 border border-border/80 bg-card/60 p-2 sm:p-2.5 text-[11px] sm:text-xs leading-tight"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="line-clamp-2 sm:line-clamp-none">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Sticky Bottom Action Bar */}
        {!isSold && (
          <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-border bg-background/95 p-3 pb-safe backdrop-blur-md shadow-2xl lg:hidden">
            <a
              href={waLink(car.title)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-gold py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-gold active:scale-[0.98] transition-transform"
            >
              <MessageCircle className="h-4 w-4" /> {t.waQuote}
            </a>
            <a
              href={`tel:${cmsConfig.contact.phone.replace(/\s+/g, "")}`}
              className="flex items-center justify-center gap-1.5 border border-primary bg-card px-4 py-3 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground active:scale-[0.98] transition-transform"
            >
              <Phone className="h-4 w-4" /> {t.call}
            </a>
          </div>
        )}
      </main>

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      {lightboxOpen && (
        <ImageLightboxModal
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={car.images}
          initialIndex={img}
          title={`${car.year} ${car.title}`}
        />
      )}
    </div>
  );
}
