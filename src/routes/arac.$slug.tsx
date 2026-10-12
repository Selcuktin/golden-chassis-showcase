import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Phone,
  Play,
  Share2,
} from "lucide-react";
import {
  CARS,
  PHONE_RAW,
  T,
  translateTerm,
  useByCarStore,
  waLink,
  type Lang,
} from "@/lib/bycar";
import { QuickOfferForm } from "./index";

export const Route = createFileRoute("/arac/$slug")({
  head: ({ params }) => {
    const found = CARS.find((c) => c.id === params.slug && c.status !== "draft");
    if (!found) {
      return {
        meta: [
          { title: "Araç Bulunamadı (404) — ByCar Global" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
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
        { property: "og:image", content: found.images[0] },
      ],
    };
  },
  component: VehicleDetailPage,
});

function VehicleDetailPage() {
  const { slug } = Route.useParams();
  const { cars, settings, lang, setLang } = useByCarStore();
  const t = T[lang];
  const [img, setImg] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [copied, setCopied] = useState(false);

  const car = cars.find((c) => c.id === slug && c.status !== "draft");

  if (!car) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
        <p className="mb-2 text-xs uppercase tracking-[0.4em] text-primary">
          HTTP 404 · BYCAR GLOBAL
        </p>
        <h1 className="font-display text-4xl font-semibold md:text-6xl">
          {lang === "tr" ? "Araç Bulunamadı" : "Vehicle Not Found"}
        </h1>
        <p className="mt-4 max-w-md text-sm text-muted-foreground">
          {lang === "tr"
            ? "Aradığınız araç koleksiyondan kaldırılmış, taslağa alınmış veya satılmış olabilir."
            : "The requested vehicle may have been removed, archived, or placed in draft mode."}
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-gold"
        >
          <ArrowLeft className="h-4 w-4" />
          {lang === "tr" ? "Koleksiyona Dön" : "Back to Collection"}
        </Link>
      </div>
    );
  }

  const isSold = Boolean(car.sold || car.status === "sold");
  const localizedExtras =
    lang === "en" && car.extrasEn && car.extrasEn.length > 0
      ? car.extrasEn
      : (car.extras || []).map((item) => translateTerm(item, lang));

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
    image: car.images,
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: car.km,
      unitCode: "KMT",
    },
    offers: {
      "@type": "Offer",
      url: `https://bycarglobal.com/arac/${car.id}`,
      availability: isSold
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: carJsonLd }}
      />

      {/* Top Bar */}
      <header className="border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link
            to="/"
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

      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Left: Multi-Angle Gallery */}
          <div className="lg:col-span-7">
            <div className="relative mb-3 overflow-hidden border border-border bg-black">
              {showVideo && car.video ? (
                <video
                  src={car.video}
                  controls
                  autoPlay
                  className="aspect-[16/10] w-full bg-black object-contain"
                />
              ) : car.imageFit === "contain" ? (
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <img
                    src={car.images[img]}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl brightness-50"
                  />
                  <img
                    src={car.images[img]}
                    alt={`${car.title} - ${img + 1}`}
                    className="relative z-10 h-full w-full object-contain"
                  />
                </div>
              ) : (
                <img
                  src={car.images[img]}
                  alt={`${car.title} - ${img + 1}`}
                  className="aspect-[16/10] w-full object-cover"
                />
              )}

              {!showVideo && car.images.length > 1 && (
                <>
                  <button
                    onClick={prevImg}
                    className="absolute left-3 top-1/2 z-20 -translate-y-1/2 cursor-pointer border border-border bg-background/80 p-2 text-foreground hover:border-primary hover:text-primary"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImg}
                    className="absolute right-3 top-1/2 z-20 -translate-y-1/2 cursor-pointer border border-border bg-background/80 p-2 text-foreground hover:border-primary hover:text-primary"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {car.images.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setShowVideo(false);
                    setImg(i);
                  }}
                  className={`w-24 shrink-0 cursor-pointer border-2 transition ${
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
                  className={`flex w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 border-2 bg-card text-xs font-semibold uppercase ${
                    showVideo ? "border-primary text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  <Play className="h-5 w-5 fill-current" />
                  <span>{lang === "tr" ? "VİDEO" : "VIDEO"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Specs & Offer */}
          <div className="lg:col-span-5">
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
            <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
              {car.title}
            </h1>

            <div className="my-4 flex flex-wrap gap-2 text-xs uppercase">
              <span className="border border-border bg-card px-3 py-1">{car.year}</span>
              <span className="border border-border bg-card px-3 py-1">
                {car.km.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")} KM
              </span>
              <span className="border border-border bg-card px-3 py-1">
                {translateTerm(car.fuel, lang)}
              </span>
              <span className="border border-border bg-card px-3 py-1">
                {translateTerm(car.gear, lang)}
              </span>
              <span className="border border-border bg-card px-3 py-1">{car.body}</span>
            </div>

            {car.description && (
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                {car.description[lang]}
              </p>
            )}

            <div className="mb-6 border border-border bg-card p-4 text-sm">
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
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={waLink(car.title)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-gold px-4 py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-gold"
                  >
                    <MessageCircle className="h-4 w-4" /> {t.waQuote}
                  </a>
                  <a
                    href={`tel:+${PHONE_RAW}`}
                    className="inline-flex items-center justify-center gap-2 border border-primary px-4 py-3 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Phone className="h-4 w-4" /> {t.call}
                  </a>
                </div>
                <div className="border border-border bg-card p-5">
                  <h2 className="mb-3 font-display text-2xl font-semibold">{t.form}</h2>
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

        {/* Equipment & Options Grid */}
        {localizedExtras.length > 0 && (
          <div className="mt-12 border-t border-border pt-10">
            <h2 className="mb-6 font-display text-3xl font-semibold">
              {lang === "tr"
                ? `Donanım & Opsiyonlar (${localizedExtras.length})`
                : `Equipment & Options (${localizedExtras.length})`}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {localizedExtras.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 border border-border bg-card p-3.5 text-xs"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
