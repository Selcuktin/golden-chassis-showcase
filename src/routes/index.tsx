import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  MessageCircle,
  Phone,
  Instagram,
  X,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Play,
  ShieldCheck,
  Sparkles,
  Lock,
  Menu,
  SlidersHorizontal,
  RotateCcw,
  Share2,
  ExternalLink,
  Star,
} from "lucide-react";
import hero from "@/assets/hero.jpg";
import {
  BRANDS,
  INSTAGRAM,
  PHONE,
  PHONE_RAW,
  T,
  waLink,
  useByCarStore,
  addStoredInquiry,
  translateTerm,
  type Car,
  type Lang,
  type SiteSettings,
} from "@/lib/bycar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ByCar — Exclusive Automotive | Luxury Without Borders" },
      {
        name: "description",
        content:
          "Cupra, Audi, Ferrari, Porsche, Lamborghini, Rolls-Royce, Mercedes-AMG, BMW M, Audi RS ve Bentley. Özel koleksiyon ve VIP araç ithalatı.",
      },
      { property: "og:title", content: "ByCar — Exclusive Automotive" },
      {
        property: "og:description",
        content: "Lüksün Yeni Adresi. Dünyanın en seçkin otomobilleri, sizin için.",
      },
    ],
  }),
  component: Index,
});

const ids = ["koleksiyon", "ithalat", "surec", "kurucu", "sss", "iletisim"];
const goldBtn =
  "inline-flex items-center justify-center gap-2 bg-gold text-primary-foreground px-6 py-3 text-sm font-semibold tracking-wider uppercase shadow-gold hover:brightness-110 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer";
const outlineBtn =
  "inline-flex items-center justify-center gap-2 border border-primary text-primary bg-background/60 px-6 py-3 text-sm font-semibold tracking-wider uppercase hover:bg-primary hover:text-primary-foreground transition cursor-pointer";
const input =
  "w-full bg-background border border-input px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground";

function Index() {
  const { cars, settings, cmsConfig, lang, setLang } = useByCarStore();
  const t = T[lang];

  const navItems = [
    { label: t.nav[0], id: "koleksiyon", show: true },
    { label: t.nav[1], id: "ithalat", show: true },
    {
      label: lang === "tr" ? "Hizmetler" : "Services",
      id: "hizmetler",
      show: Boolean(cmsConfig.sectionVisibility.showServices),
    },
    {
      label: t.nav[2],
      id: "surec",
      show: Boolean(cmsConfig.sectionVisibility.showConcierge),
    },
    {
      label: t.nav[3],
      id: "kurucu",
      show: Boolean(cmsConfig.sectionVisibility.showAbout),
    },
    {
      label: lang === "tr" ? "Yorumlar" : "Reviews",
      id: "yorumlar",
      show: Boolean(cmsConfig.sectionVisibility.showTestimonials),
    },
    {
      label: t.nav[4],
      id: "sss",
      show: Boolean(cmsConfig.sectionVisibility.showFaq),
    },
    { label: t.nav[5], id: "iletisim", show: true },
  ].filter((item) => item.show);
  const [brand, setBrand] = useState("");
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [body, setBody] = useState("");
  const [fuel, setFuel] = useState("");
  const [gear, setGear] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "sold">("all");
  const [showFilters, setShowFilters] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [detail, setDetail] = useState<Car | null>(null);
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showKvkk, setShowKvkk] = useState(false);
  const [cookieAccepted, setCookieAccepted] = useState(true);

  useEffect(() => {
    setShowFilters(settings.filterPanelDefaultOpen);
  }, [settings.filterPanelDefaultOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("bycar_cookie_consent_v1");
      setCookieAccepted(saved === "1");
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const visibleCars = useMemo(
    () => cars.filter((c) => c.status !== "draft"),
    [cars],
  );

  // Hybrid Brand List: Pinned luxury brands + any new custom brands from added vehicles
  const hybridBrands = useMemo(() => {
    const base = settings.pinnedBrands?.length ? settings.pinnedBrands : BRANDS;
    const dynamic = visibleCars.map((c) => c.brand).filter(Boolean);
    return Array.from(new Set([...base, ...dynamic]));
  }, [settings.pinnedBrands, visibleCars]);

  const availableYears = useMemo(
    () =>
      Array.from(new Set(visibleCars.map((c) => String(c.year)))).sort((a, b) =>
        Number(b) - Number(a),
      ),
    [visibleCars],
  );

  const availableBodies = useMemo(
    () =>
      Array.from(
        new Set([
          "Coupe",
          "SUV",
          "Sedan",
          "Cabrio",
          ...visibleCars.map((c) => c.body).filter(Boolean),
        ]),
      ),
    [visibleCars],
  );

  const availableFuels = useMemo(
    () =>
      Array.from(
        new Set([
          "Benzin",
          "Hibrit",
          "Elektrik",
          "Dizel",
          ...visibleCars.map((c) => c.fuel).filter(Boolean),
        ]),
      ),
    [visibleCars],
  );

  const availableGears = useMemo(
    () =>
      Array.from(
        new Set([
          "Otomatik",
          "Manuel",
          ...visibleCars.map((c) => c.gear).filter(Boolean),
        ]),
      ),
    [visibleCars],
  );

  const activeFilterCount = useMemo(
    () =>
      [
        brand,
        q,
        year,
        body,
        fuel,
        gear,
        statusFilter !== "all" ? statusFilter : "",
      ].filter(Boolean).length,
    [brand, q, year, body, fuel, gear, statusFilter],
  );

  const resetAllFilters = () => {
    setBrand("");
    setQ("");
    setYear("");
    setBody("");
    setFuel("");
    setGear("");
    setStatusFilter("all");
  };

  const list = useMemo(
    () =>
      visibleCars.filter((c) => {
        const isSold = Boolean(c.sold || c.status === "sold");
        if (statusFilter === "available" && isSold) return false;
        if (statusFilter === "sold" && !isSold) return false;

        const brandMatches =
          !brand ||
          c.brand === brand ||
          (brand === "Audi" && c.brand.startsWith("Audi")) ||
          (brand === "Audi RS" &&
            (c.brand === "Audi RS" || c.title.toLowerCase().includes("rs")));

        return (
          brandMatches &&
          (!year || String(c.year) === year) &&
          (!body || c.body === body) &&
          (!fuel || c.fuel === fuel) &&
          (!gear || c.gear === gear) &&
          (c.title.toLowerCase().includes(q.toLowerCase()) ||
            c.brand.toLowerCase().includes(q.toLowerCase()))
        );
      }),
    [visibleCars, brand, q, year, body, fuel, gear, statusFilter],
  );

  const jsonLd = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "AutoDealer",
        name: "ByCar — Exclusive Automotive",
        url: "https://bycarglobal.com",
        telephone: PHONE,
        sameAs: [INSTAGRAM],
        founder: {
          "@type": "Person",
          name: "Burak Yılmaz",
          jobTitle: "Founder & CEO",
        },
        makesOffer: visibleCars.map((c) => ({
          "@type": "Offer",
          url: `https://bycarglobal.com/arac/${c.id}`,
          availability:
            c.sold || c.status === "sold"
              ? "https://schema.org/SoldOut"
              : "https://schema.org/InStock",
          itemOffered: {
            "@type": "Car",
            name: c.title,
            brand: { "@type": "Brand", name: c.brand },
            modelDate: String(c.year),
            bodyType: c.body,
            fuelType: c.fuel,
            vehicleTransmission: c.gear,
            color: c.specs.color,
            image: c.images[0],
            mileageFromOdometer: {
              "@type": "QuantitativeValue",
              value: c.km,
              unitCode: "KMT",
            },
          },
        })),
      }),
    [visibleCars],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      {/* HEADER */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <a href="#" className="flex items-center gap-3 leading-none">
            <img
              src="/bycar-logo.jpg"
              alt="ByCar Global"
              className="h-10 w-10 rounded-full border border-primary/50 object-cover"
            />
            <div>
              <div className="font-display text-2xl font-bold tracking-[0.3em]">BYCAR</div>
              <div className="text-[9px] tracking-[0.35em] text-primary">
                EXCLUSIVE AUTOMOTIVE
              </div>
            </div>
          </a>

          <nav className="hidden gap-6 text-xs uppercase tracking-widest lg:flex">
            {navItems.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="text-muted-foreground transition hover:text-primary"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
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
            <a
              href={waLink()}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 border border-primary px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground sm:inline-flex"
            >
              <MessageCircle className="h-4 w-4" /> VIP WhatsApp
            </a>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Menü"
              className="inline-flex cursor-pointer items-center justify-center border border-border p-2 text-foreground transition hover:border-primary hover:text-primary lg:hidden active:scale-95"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE VIP FULL-HEIGHT DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[64px] bottom-0 z-50 flex flex-col justify-between border-t border-border/80 bg-background/98 p-6 backdrop-blur-2xl lg:hidden overflow-y-auto pb-safe">
          <nav className="flex flex-col space-y-3 text-sm uppercase tracking-[0.25em]">
            {navItems.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between border-b border-border/40 py-3.5 text-foreground transition hover:text-primary active:text-primary"
              >
                <span className="font-medium">{n.label}</span>
                <span className="text-xs text-primary/60">→</span>
              </a>
            ))}
          </nav>

          {/* Quick Contact & VIP Concierge Cards */}
          <div className="mt-8 space-y-3 pt-6 border-t border-border/60">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">
              {lang === "tr" ? "VIP İletişim & Konum" : "VIP Concierge & Location"}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={waLink()}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-gold py-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-gold active:scale-[0.98] transition-transform"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <a
                href={`tel:${cmsConfig.contact.phone.replace(/\s+/g, "")}`}
                className="flex items-center justify-center gap-2 border border-primary/60 bg-card py-3 text-xs font-semibold uppercase tracking-wider text-primary active:scale-[0.98] transition-transform"
              >
                <Phone className="h-4 w-4" /> {lang === "tr" ? "Hemen Ara" : "Call Now"}
              </a>
            </div>
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <a
                href={cmsConfig.contact.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5 text-primary" /> Bursa Nilüfer
              </a>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Lock className="h-3.5 w-3.5" /> VIP Admin
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="relative flex min-h-[92svh] sm:min-h-screen items-end overflow-hidden pt-28 sm:pt-36">
        <img
          src={cmsConfig.hero.bgImage || hero}
          alt="ByCar hypercar"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/15" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:pb-24">
          <p className="mb-3 text-[11px] sm:text-xs tracking-[0.5em] text-primary">
            {(lang === "tr" ? cmsConfig.hero.badgeTr : cmsConfig.hero.badgeEn) || "EXCLUSIVE AUTOMOTIVE"}
          </p>
          <h1 className="max-w-3xl text-4xl sm:text-6xl md:text-8xl font-semibold leading-tight tracking-tight">
            {(lang === "tr" ? cmsConfig.hero.titleTr : cmsConfig.hero.titleEn) || t.heroTitle}
          </h1>
          <p className="mt-4 sm:mt-6 max-w-xl text-base sm:text-lg text-muted-foreground">
            {(lang === "tr" ? cmsConfig.hero.subtitleTr : cmsConfig.hero.subtitleEn) || t.heroSub}
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <a href="#koleksiyon" className={`${goldBtn} w-full sm:w-auto text-center justify-center`}>
              {(lang === "tr" ? cmsConfig.hero.primaryBtnTextTr : cmsConfig.hero.primaryBtnTextEn) || t.explore}
            </a>
            <a href="#ithalat" className={`${outlineBtn} w-full sm:w-auto text-center justify-center`}>
              {(lang === "tr" ? cmsConfig.hero.secondaryBtnTextTr : cmsConfig.hero.secondaryBtnTextEn) || t.importReq}
            </a>
          </div>
        </div>
      </section>

      {/* STATS (Hero Altı Sayaçlar) */}
      {cmsConfig.sectionVisibility.showHeroStats && cmsConfig.stats?.length > 0 && (
        <section className="border-b border-border bg-card/60 py-10 backdrop-blur-sm">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 md:grid-cols-4">
            {cmsConfig.stats.map((st, i) => (
              <div key={i} className="border-l-2 border-primary/60 pl-4">
                <div className="font-display text-3xl font-bold text-gold md:text-4xl">
                  {st.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  {lang === "tr" ? st.labelTr : st.labelEn}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* COLLECTION */}
      <section id="koleksiyon" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:py-24">
        <SectionTitle kicker="Collection" title={t.collection} />

        {/* Hybrid Brand Pills (Horizontal Carousel on Mobile) + Filter Panel Toggle */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap py-1">
            {["", ...hybridBrands].map((b) => (
              <button
                key={b}
                onClick={() => setBrand(b)}
                className={`shrink-0 cursor-pointer border px-4 py-2 text-xs uppercase tracking-wider transition active:scale-95 ${
                  brand === b
                    ? "border-primary bg-primary font-semibold text-primary-foreground shadow-sm"
                    : "border-border bg-card/40 text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {b || t.all}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="inline-flex cursor-pointer items-center gap-1.5 border border-border px-3 py-2 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {lang === "tr"
                  ? `Filtreleri Temizle (${activeFilterCount})`
                  : `Reset Filters (${activeFilterCount})`}
              </button>
            )}
            <button
              onClick={() => setShowFilters((v) => !v)}
              aria-label="Gelişmiş Filtreler"
              className={`inline-flex cursor-pointer items-center gap-2 border px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                showFilters
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{lang === "tr" ? "Gelişmiş Filtre" : "Filters"}</span>
            </button>
          </div>
        </div>

        {/* Advanced Filter Bar (Admin-Configurable) */}
        {showFilters && (
          <div className="mb-10 grid gap-3 border border-border/70 bg-card/40 p-4 md:grid-cols-6">
            {settings.showSearchFilter && (
              <div className="relative md:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t.search}
                  className={`${input} pl-10`}
                />
              </div>
            )}
            {settings.showYearFilter && (
              <Sel
                v={year}
                set={setYear}
                label={lang === "tr" ? "Model Yılı" : "Model Year"}
                opts={availableYears.map((y) => ({ value: y, label: y }))}
              />
            )}
            {settings.showBodyFilter && (
              <Sel
                v={body}
                set={setBody}
                label={lang === "tr" ? "Kasa Tipi" : "Body Type"}
                opts={availableBodies.map((b) => ({
                  value: b,
                  label: b,
                }))}
              />
            )}
            {(settings.showFuelFilter || settings.showGearFilter) && (
              <div className="grid grid-cols-2 gap-3">
                {settings.showFuelFilter && (
                  <Sel
                    v={fuel}
                    set={setFuel}
                    label={lang === "tr" ? "Yakıt" : "Fuel"}
                    opts={availableFuels.map((f) => ({
                      value: f,
                      label: translateTerm(f, lang),
                    }))}
                  />
                )}
                {settings.showGearFilter && (
                  <Sel
                    v={gear}
                    set={setGear}
                    label={lang === "tr" ? "Vites" : "Gear"}
                    opts={availableGears.map((g) => ({
                      value: g,
                      label: translateTerm(g, lang),
                    }))}
                  />
                )}
              </div>
            )}
            {settings.showStatusFilter && (
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "available" | "sold")
                }
                className={input}
              >
                <option value="all">{t.statusAll}</option>
                <option value="available">{t.statusAvailable}</option>
                <option value="sold">{t.statusSold}</option>
              </select>
            )}
          </div>
        )}

        {/* Vehicle Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const isSold = Boolean(c.sold || c.status === "sold");
            const fitMode = c.imageFit || settings.defaultCardFit || "cover";
            return (
              <article
                key={c.id}
                className="group relative flex flex-col overflow-hidden border border-border bg-card transition hover:border-primary/60"
              >
                <button
                  onClick={() => setDetail(c)}
                  className="relative block aspect-[16/10] w-full cursor-pointer overflow-hidden bg-black text-left"
                >
                  {fitMode === "contain" ? (
                    <>
                      {/* Luxury Blurred Studio Reflection Backdrop */}
                      <div
                        className="absolute inset-0 h-full w-full scale-125 bg-cover bg-center opacity-65 blur-xl brightness-75 transition duration-700 group-hover:scale-135"
                        style={{ backgroundImage: `url(${c.images[0]})` }}
                      />
                      <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
                      {/* Uncropped Full Vehicle Image (Fits Plate & Roof 100%) */}
                      <img
                        src={c.images[0]}
                        alt={c.title}
                        loading="lazy"
                        width={1280}
                        height={832}
                        className={`relative z-10 h-full w-full object-contain p-1 transition duration-700 group-hover:scale-105 ${
                          isSold ? "grayscale-[60%]" : ""
                        }`}
                      />
                    </>
                  ) : (
                    <img
                      src={c.images[0]}
                      alt={c.title}
                      loading="lazy"
                      width={1280}
                      height={832}
                      className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${
                        isSold ? "grayscale-[60%]" : ""
                      }`}
                    />
                  )}

                  {/* Featured Badge */}
                  {c.featured && !isSold && (
                    <div className="absolute left-2.5 top-2.5 z-20 inline-flex items-center gap-1 border border-primary/60 bg-background/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur-sm">
                      <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                      <span>{lang === "tr" ? "ÖNE ÇIKAN" : "FEATURED"}</span>
                    </div>
                  )}

                  {/* Angle / Video Badge (100% Localized TR / EN) */}
                  <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5 bg-background/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary backdrop-blur-sm">
                    <span>
                      {c.images.length} {lang === "tr" ? "FOTOĞRAF" : "PHOTOS"}
                    </span>
                    {c.video && (
                      <span className="inline-flex items-center gap-1 border-l border-border pl-1.5 text-foreground">
                        <Play className="h-2.5 w-2.5 fill-primary text-primary" />{" "}
                        {lang === "tr" ? "VİDEO" : "VIDEO"}
                      </span>
                    )}
                  </div>

                  {/* Sold Overlay Badge */}
                  {isSold && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/55">
                      <span className="rotate-[-10deg] border-2 border-destructive bg-background/90 px-6 py-2 text-xl font-bold tracking-[0.35em] text-destructive shadow-lg">
                        {t.sold}
                      </span>
                    </div>
                  )}
                </button>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {[
                        c.year,
                        `${c.km.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")} KM`,
                        translateTerm(c.fuel, lang),
                        translateTerm(c.gear, lang),
                        c.body,
                      ].map((x) => (
                        <span key={x} className="border border-border px-2 py-0.5">
                          {x}
                        </span>
                      ))}
                    </div>
                    <h3
                      onClick={() => setDetail(c)}
                      className="mb-2 cursor-pointer text-2xl font-semibold transition hover:text-primary"
                    >
                      {c.title}
                    </h3>
                    <p className="mb-5 text-xs text-muted-foreground">
                      {translateTerm(c.specs.power, lang)} ·{" "}
                      {translateTerm(c.specs.color, lang)}
                    </p>
                  </div>

                  {isSold ? (
                    <button
                      disabled
                      className="w-full border border-destructive/40 bg-destructive/10 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-destructive opacity-80"
                    >
                      {t.soldBtn}
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={waLink(c.title)}
                        target="_blank"
                        rel="noreferrer"
                        className={`${goldBtn} !px-3 !text-xs min-h-[44px] flex items-center justify-center active:scale-[0.98] transition-transform`}
                      >
                        <MessageCircle className="h-3.5 w-3.5 shrink-0" /> {t.quote}
                      </a>
                      <button
                        onClick={() => setDetail(c)}
                        className={`${outlineBtn} !px-3 !text-xs min-h-[44px] flex items-center justify-center active:scale-[0.98] transition-transform`}
                      >
                        {lang === "tr" ? "Detay & Teklif" : "Details & Offer"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* PRIVATE IMPORT */}
      <section id="ithalat" className="scroll-mt-20 border-y border-border bg-card py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-2">
          <div>
            <SectionTitle kicker="Private Import" title={t.importTitle} />
            <p className="mb-6 leading-relaxed text-muted-foreground">{t.importSub}</p>
            <div className="space-y-3 border-l-2 border-primary/50 pl-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>
                  {lang === "tr"
                    ? "Uluslararası TÜV / DEKRA Ekspertiz Garantisi"
                    : "International TÜV / DEKRA Inspection Guarantee"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>
                  {lang === "tr"
                    ? "Sigortalı Kapalı Lojistik & Anahtar Teslim Gümrükleme"
                    : "Insured Enclosed Transport & Turnkey Customs"}
                </span>
              </div>
            </div>
          </div>
          <ImportRequestForm
            t={t}
            lang={lang}
            autoWhatsApp={settings.whatsappAutoOpenOnForm}
          />
        </div>
      </section>

      {/* SERVICES (VIP Hizmetlerimiz) */}
      {cmsConfig.sectionVisibility.showServices && cmsConfig.services?.length > 0 && (
        <section id="hizmetler" className="scroll-mt-20 border-t border-border bg-card/30 py-24">
          <div className="mx-auto max-w-7xl px-4">
            <SectionTitle
              kicker="Exclusive Services"
              title={lang === "tr" ? "Ayrıcalıklı Hizmetlerimiz" : "Bespoke Services"}
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cmsConfig.services.map((srv, idx) => (
                <div
                  key={srv.id || idx}
                  className="border border-border bg-card p-6 transition duration-300 hover:border-primary/60 hover:-translate-y-1"
                >
                  <div className="mb-4 font-display text-4xl text-gold">0{idx + 1}</div>
                  <h3 className="mb-2 text-lg font-semibold">
                    {lang === "tr" ? srv.titleTr : srv.titleEn}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {lang === "tr" ? srv.descTr : srv.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PROCESS / CONCIERGE */}
      {cmsConfig.sectionVisibility.showConcierge && (
        <section id="surec" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24">
          <SectionTitle kicker="Process" title={t.process} />
          <div className="grid gap-6 md:grid-cols-4">
            {(cmsConfig.conciergeSteps?.length > 0
              ? cmsConfig.conciergeSteps.map((cs) => [
                  lang === "tr" ? cs.titleTr : cs.titleEn,
                  lang === "tr" ? cs.descTr : cs.descEn,
                ])
              : t.steps
            ).map(([h, d], i) => (
              <div
                key={h}
                className="border border-border bg-card/40 p-6 transition hover:border-primary/60"
              >
                <div className="mb-4 font-display text-5xl text-gold">0{i + 1}</div>
                <h3 className="mb-2 text-xl font-semibold">{h}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FOUNDER'S VISION / ABOUT */}
      {cmsConfig.sectionVisibility.showAbout && (
        <section id="kurucu" className="scroll-mt-20 border-t border-border bg-card py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-12">
            <div className="flex flex-col items-center lg:col-span-4">
              <div className="relative overflow-hidden rounded-full border-2 border-primary/60 p-2 shadow-gold">
                <img
                  src="/bycar-logo.jpg"
                  alt="Burak Yılmaz — ByCar Global"
                  className="h-56 w-56 rounded-full object-cover md:h-64 md:w-64"
                />
              </div>
              <div className="mt-6 text-center">
                <div className="font-display text-3xl font-semibold">Burak Yılmaz</div>
                <div className="mt-1 text-xs tracking-[0.3em] text-primary">
                  FOUNDER & CEO | BYCAR GLOBAL
                </div>
              </div>
            </div>
            <div className="lg:col-span-8">
              <SectionTitle
                kicker="Founder & Vision"
                title={
                  (lang === "tr" ? cmsConfig.about.headingTr : cmsConfig.about.headingEn) ||
                  t.founder
                }
              />
              <div className="space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg whitespace-pre-line">
                {(lang === "tr" ? cmsConfig.about.storyTr : cmsConfig.about.storyEn) ? (
                  <p>{lang === "tr" ? cmsConfig.about.storyTr : cmsConfig.about.storyEn}</p>
                ) : (
                  t.founderParagraphs.map((p, idx) => <p key={idx}>{p}</p>)
                )}
              </div>
              <div className="mt-8 border-l-2 border-primary pl-4 font-display text-2xl italic text-primary">
                {(lang === "tr" ? cmsConfig.about.sloganTr : cmsConfig.about.sloganEn) ||
                  t.founderSlogan}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {cmsConfig.sectionVisibility.showTestimonials && cmsConfig.testimonials?.length > 0 && (
        <section id="yorumlar" className="scroll-mt-20 border-t border-border bg-card/30 py-24">
          <div className="mx-auto max-w-7xl px-4">
            <SectionTitle
              kicker="VIP Testimonials"
              title={lang === "tr" ? "Seçkin Müşteri Deneyimleri" : "Client Reviews"}
              center
            />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {cmsConfig.testimonials.map((test) => (
                <div
                  key={test.id}
                  className="relative flex flex-col justify-between border border-border bg-card p-6"
                >
                  <div>
                    <div className="mb-4 flex items-center gap-1 text-gold">
                      {Array.from({ length: test.rating || 5 }).map((_, rIdx) => (
                        <Star key={rIdx} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="mb-6 text-sm italic leading-relaxed text-muted-foreground">
                      "{lang === "tr" ? test.commentTr : test.commentEn}"
                    </p>
                  </div>
                  <div className="border-t border-border/60 pt-4">
                    <div className="font-semibold text-foreground">{test.name}</div>
                    <div className="text-xs text-primary">
                      {lang === "tr" ? test.roleTr : test.roleEn} · {test.car}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ ACCORDION */}
      {cmsConfig.sectionVisibility.showFaq && (
        <section id="sss" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-24">
          <SectionTitle kicker="FAQ" title={t.faq} center />
          <p className="-mt-6 mb-10 text-center text-sm text-muted-foreground">
            {t.faqSub}
          </p>
          <div className="divide-y divide-border border border-border bg-card">
            {(cmsConfig.faqs?.length > 0
              ? cmsConfig.faqs.map((f) => [
                  lang === "tr" ? f.qTr : f.qEn,
                  lang === "tr" ? f.aTr : f.aEn,
                ])
              : t.faqs
            ).map(([qText, aText], idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left transition hover:text-primary"
                  >
                    <span className="font-display text-xl font-semibold">{qText}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-primary transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/50 bg-background/40 px-6 py-5 text-sm leading-relaxed text-muted-foreground">
                      {aText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer id="iletisim" className="scroll-mt-20 border-t border-border bg-card/50 pt-16 pb-28 sm:pb-16 pb-safe">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/bycar-logo.jpg"
                alt="ByCar"
                className="h-10 w-10 rounded-full border border-primary/50 object-cover"
              />
              <div>
                <div className="font-display text-2xl font-bold tracking-[0.3em]">BYCAR</div>
                <div className="text-[9px] tracking-[0.3em] text-primary">
                  EXCLUSIVE AUTOMOTIVE
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Luxury Without Borders · bycarglobal.com
            </p>
            <p className="mt-1 text-xs text-muted-foreground/80">
              {cmsConfig.contact.address}
            </p>
            <p className="mt-1 text-xs text-primary/80">
              {lang === "tr" ? cmsConfig.contact.hoursTr : cmsConfig.contact.hoursEn}
            </p>
          </div>
          <div className="space-y-2.5 text-sm">
            <a
              href={`tel:${cmsConfig.contact.phone.replace(/\s+/g, "")}`}
              className="flex items-center gap-2 transition hover:text-primary"
            >
              <Phone className="h-4 w-4 text-primary" />
              {cmsConfig.contact.phoneDisplay || cmsConfig.contact.phone}
            </a>
            <a
              href={cmsConfig.contact.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 transition hover:text-primary"
            >
              <Instagram className="h-4 w-4 text-primary" />
              Instagram @bycarglobal
            </a>
            <a
              href={waLink()}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 transition hover:text-primary"
            >
              <MessageCircle className="h-4 w-4 text-primary" />
              WhatsApp VIP Concierge
            </a>
            <a
              href={`mailto:${cmsConfig.contact.email}`}
              className="flex items-center gap-2 text-muted-foreground transition hover:text-primary"
            >
              <span className="font-semibold text-primary">@</span>
              {cmsConfig.contact.email}
            </a>
          </div>
          <div className="space-y-2.5 text-sm text-muted-foreground">
            <a href="#sss" className="block transition hover:text-primary">
              {t.faq}
            </a>
            <button
              onClick={() => setShowKvkk(true)}
              className="block cursor-pointer text-left transition hover:text-primary"
            >
              {t.privacy}
            </button>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-primary transition hover:underline"
            >
              <Lock className="h-3.5 w-3.5" />{" "}
              {lang === "tr" ? "VIP Yönetim Paneli (Admin)" : "VIP Admin Dashboard"}
            </Link>
          </div>
        </div>
      </footer>

      {/* VIP COOKIE CONSENT BANNER (F10) */}
      {!cookieAccepted && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/40 bg-background/95 px-4 py-3.5 pb-safe shadow-2xl backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-xs">
            <p className="text-muted-foreground">
              {lang === "tr"
                ? "ByCar Global, size özel dil ve koleksiyon tercihlerinizi hatırlamak için KVKK uyumlu zorunlu çerezler kullanır."
                : "ByCar Global uses essential GDPR/KVKK-compliant cookies to remember your language and showroom preferences."}
              <button
                onClick={() => setShowKvkk(true)}
                className="ml-2 cursor-pointer text-primary underline"
              >
                {t.privacy}
              </button>
            </p>
            <button
              onClick={() => {
                window.localStorage.setItem("bycar_cookie_consent_v1", "1");
                setCookieAccepted(true);
              }}
              className={`${goldBtn} !px-5 !py-2 !text-xs`}
            >
              {lang === "tr" ? "Kabul Et" : "Accept"}
            </button>
          </div>
        </div>
      )}

      {/* FLOATING VIP WHATSAPP BUTTON */}
      {cmsConfig.sectionVisibility.showFloatingWhatsapp && (
        <a
          href={waLink()}
          target="_blank"
          rel="noreferrer"
          aria-label="VIP WhatsApp İletişim"
          className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 mb-safe z-40 flex items-center gap-2.5 rounded-full border border-primary bg-background/95 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-primary shadow-gold backdrop-blur transition hover:scale-105 active:scale-95 hover:bg-primary hover:text-primary-foreground"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">VIP WhatsApp</span>
        </a>
      )}

      {/* VEHICLE DETAIL MODAL */}
      {detail && (
        <DetailModal
          car={detail}
          t={t}
          lang={lang}
          settings={settings}
          onClose={() => setDetail(null)}
          onOffer={() => {
            const title = detail.title;
            setDetail(null);
            setOfferFor(title);
          }}
        />
      )}

      {/* STANDALONE OFFER MODAL */}
      {offerFor && (
        <Modal onClose={() => setOfferFor(null)}>
          <h3 className="mb-1 text-3xl font-semibold">{t.form}</h3>
          <p className="mb-6 text-sm text-primary">{offerFor}</p>
          <QuickOfferForm
            carTitle={offerFor}
            t={t}
            lang={lang}
            autoWhatsApp={settings.whatsappAutoOpenOnForm}
          />
        </Modal>
      )}

      {/* KVKK & PRIVACY MODAL */}
      {showKvkk && (
        <Modal onClose={() => setShowKvkk(false)}>
          <p className="mb-1 text-xs uppercase tracking-[0.35em] text-primary">BYCAR GLOBAL</p>
          <h3 className="mb-6 text-3xl font-semibold">{t.kvkkTitle}</h3>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            {t.kvkkBody.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function SectionTitle({
  kicker,
  title,
  center,
}: {
  kicker: string;
  title: string;
  center?: boolean;
}) {
  return (
    <div className={`mb-10 ${center ? "text-center" : ""}`}>
      <p className="mb-2 text-xs uppercase tracking-[0.5em] text-primary">{kicker}</p>
      <h2 className="text-4xl font-semibold md:text-6xl">{title}</h2>
    </div>
  );
}

function Sel({
  v,
  set,
  label,
  opts,
}: {
  v: string;
  set: (s: string) => void;
  label: string;
  opts: { value: string; label: string }[];
}) {
  return (
    <select value={v} onChange={(e) => set(e.target.value)} className={input}>
      <option value="">{label}</option>
      {opts.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ImportRequestForm({
  t,
  lang,
  autoWhatsApp,
}: {
  t: (typeof T)["tr"];
  lang: Lang;
  autoWhatsApp: boolean;
}) {
  const [doneUrl, setDoneUrl] = useState<string | null>(null);
  if (doneUrl) {
    return (
      <div className="flex flex-col items-start justify-center border border-primary bg-background/60 p-8">
        <CheckCircle2 className="mb-3 h-8 w-8 text-primary" />
        <p className="text-base text-foreground">{t.sent}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={doneUrl}
            target="_blank"
            rel="noreferrer"
            className={`${goldBtn} !px-4 !py-2.5 !text-xs`}
          >
            <MessageCircle className="h-4 w-4" />
            {lang === "tr" ? "WhatsApp ile Anında Gönder" : "Send via WhatsApp Now"}
          </a>
          <button
            onClick={() => setDoneUrl(null)}
            className="cursor-pointer border border-border px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary"
          >
            {lang === "tr" ? "Yeni Talep Gönder" : "Submit Another Request"}
          </button>
        </div>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const model = String(fd.get("model") || "");
        const year = String(fd.get("year") || "");
        const budget = String(fd.get("budget") || "");
        const currency = String(fd.get("currency") || "EUR");
        const country = String(fd.get("country") || "");
        const name = String(fd.get("name") || "");
        const phone = String(fd.get("phone") || "");

        // 1. Save to Admin Inbox
        addStoredInquiry({
          type: "İthalat",
          name,
          phone,
          car: `${model} (${year})`,
          offerOrBudget: `${budget} ${currency} — ${country}`,
        });

        // 2. Prepare & Open WhatsApp (Dual-Channel Flow)
        const waMsg = `Merhaba ByCar Global, web sitenizden Özel İthalat Talebi gönderdim:\n• Araç: ${model} (${year})\n• Bütçe / Ülke: ${budget} ${currency} (${country})\n• Ad Soyad: ${name}\n• Telefon: ${phone}`;
        const url = waLink(undefined, waMsg);
        setDoneUrl(url);
        if (autoWhatsApp && typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <input name="model" required placeholder={t.f.model} className={`${input} sm:col-span-2`} />
      <input name="year" required placeholder={t.f.year} className={input} />
      <div className="flex gap-2">
        <input name="budget" required placeholder={t.f.budget} className={input} />
        <select name="currency" className={`${input} w-28`}>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="TL">TL</option>
        </select>
      </div>
      <input name="country" required placeholder={t.f.country} className={`${input} sm:col-span-2`} />
      <input name="name" required placeholder={t.f.name} className={input} />
      <input name="phone" required placeholder={t.f.phone} className={input} />
      <button type="submit" className={`${goldBtn} sm:col-span-2`}>
        {t.send}
      </button>
    </form>
  );
}

export function QuickOfferForm({
  carTitle,
  t,
  lang = "tr",
  autoWhatsApp = true,
}: {
  carTitle: string;
  t: (typeof T)["tr"];
  lang?: Lang;
  autoWhatsApp?: boolean;
}) {
  const [doneUrl, setDoneUrl] = useState<string | null>(null);
  if (doneUrl) {
    return (
      <div className="border border-primary bg-background/50 p-6">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <CheckCircle2 className="h-5 w-5" />
          <span>{t.sent}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={doneUrl}
            target="_blank"
            rel="noreferrer"
            className={`${goldBtn} !px-4 !py-2 !text-xs`}
          >
            <MessageCircle className="h-4 w-4" />
            {lang === "tr" ? "WhatsApp ile Anında Gönder" : "Send via WhatsApp Now"}
          </a>
          <button
            onClick={() => setDoneUrl(null)}
            className="cursor-pointer border border-border px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary"
          >
            {lang === "tr" ? "Yeni Teklif Gönder" : "Send Another Offer"}
          </button>
        </div>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = String(fd.get("name") || "");
        const phone = String(fd.get("phone") || "");
        const offer = String(fd.get("offer") || "");

        // 1. Save to Admin Inbox
        addStoredInquiry({
          type: "Teklif",
          name,
          phone,
          car: carTitle,
          offerOrBudget: offer,
        });

        // 2. Prepare & Open WhatsApp (Dual-Channel Flow)
        const waMsg = `Merhaba ByCar Global, web sitenizdeki "${carTitle}" aracınız için teklif/bilgi talebim:\n• Ad Soyad: ${name}\n• Telefon: ${phone}\n• Teklif / Not: ${offer}`;
        const url = waLink(undefined, waMsg);
        setDoneUrl(url);
        if (autoWhatsApp && typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <input name="name" required placeholder={t.f.name} className={input} />
      <input name="phone" required placeholder={t.f.phone} className={input} />
      <textarea
        name="offer"
        required
        placeholder={t.f.offer}
        rows={3}
        className={`${input} sm:col-span-2`}
      />
      <button type="submit" className={`${goldBtn} sm:col-span-2`}>
        {t.send}
      </button>
    </form>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  // Prevent background scroll while modal is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/90 p-0 sm:p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-h-[94dvh] sm:max-h-[92dvh] w-full max-w-4xl border border-border bg-popover shadow-2xl rounded-t-2xl sm:rounded-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Mobile/Desktop Top Bar with Persistent Close Button */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-popover/95 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-10 rounded-full bg-border sm:hidden" />
            <span className="hidden sm:inline font-display text-sm tracking-widest text-primary uppercase">
              BYCAR EXCLUSIVE SHOWROOM
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 cursor-pointer border border-border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary active:scale-95"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
            <span className="text-[10px] uppercase font-semibold">Kapat</span>
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-4 sm:p-6 no-scrollbar sm:scroll-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function DetailModal({
  car,
  t,
  lang,
  settings,
  onClose,
  onOffer,
}: {
  car: Car;
  t: (typeof T)["tr"];
  lang: Lang;
  settings: SiteSettings;
  onClose: () => void;
  onOffer: () => void;
}) {
  const [img, setImg] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [copied, setCopied] = useState(false);
  const isSold = Boolean(car.sold || car.status === "sold");

  const defaultTab = (() => {
    const preferred = settings.modalDefaultTab || "specs";
    if (preferred === "specs" && settings.modalShowSpecsTab) return "specs";
    if (preferred === "extras" && settings.modalShowExtrasTab) return "extras";
    if (preferred === "offer" && settings.modalShowOfferTab && !isSold) return "offer";
    if (settings.modalShowSpecsTab) return "specs";
    if (settings.modalShowExtrasTab) return "extras";
    if (settings.modalShowOfferTab && !isSold) return "offer";
    return "specs";
  })();
  const [activeTab, setActiveTab] = useState<"specs" | "extras" | "offer">(defaultTab);

  const prevImg = () => {
    setShowVideo(false);
    setImg((prev) => (prev === 0 ? car.images.length - 1 : prev - 1));
  };
  const nextImg = () => {
    setShowVideo(false);
    setImg((prev) => (prev === car.images.length - 1 ? 0 : prev + 1));
  };

  // Keyboard Navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prevImg();
      if (e.key === "ArrowRight") nextImg();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const labels =
    lang === "tr"
      ? {
          expertise: "Ekspertiz Durumu",
          package: "Donanım / Paket",
          tramer: "Tramer Kaydı",
          power: "Motor Gücü",
          color: "Dış / İç Renk",
        }
      : {
          expertise: "Inspection Status",
          package: "Trim / Package",
          tramer: "Damage Record",
          power: "Engine Power",
          color: "Exterior / Interior Color",
        };

  const localizedExtras =
    lang === "en" && car.extrasEn && car.extrasEn.length > 0
      ? car.extrasEn
      : (car.extras || []).map((item) => translateTerm(item, lang));

  const copyShareUrl = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/arac/${car.id}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal onClose={onClose}>
      {/* Main Media Viewer (Multi-Angle Photo or MP4 Video) */}
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
            <div
              className="absolute inset-0 h-full w-full scale-125 bg-cover bg-center opacity-65 blur-xl brightness-75"
              style={{ backgroundImage: `url(${car.images[img]})` }}
            />
            <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
            <img
              src={car.images[img]}
              alt={`${car.title} - Açı ${img + 1}`}
              className="relative z-10 h-full w-full object-contain p-1"
            />
          </div>
        ) : (
          <img
            src={car.images[img]}
            alt={`${car.title} - Açı ${img + 1}`}
            className="aspect-[16/10] w-full object-cover"
          />
        )}

        {!showVideo && car.images.length > 1 && (
          <>
            <button
              onClick={prevImg}
              aria-label="Önceki Açı"
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 cursor-pointer border border-border bg-background/80 p-2 text-foreground transition hover:border-primary hover:text-primary"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImg}
              aria-label="Sonraki Açı"
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 cursor-pointer border border-border bg-background/80 p-2 text-foreground transition hover:border-primary hover:text-primary"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="absolute bottom-3 left-3 z-20 bg-background/85 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
          {showVideo
            ? lang === "tr"
              ? "Video İnceleme"
              : "Video Tour"
            : `${lang === "tr" ? "Açı" : "Angle"} ${img + 1} / ${car.images.length}`}
        </div>
      </div>

      {/* Multi-Angle Thumbnail Strip + Video Button */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
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
            className={`flex w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 border-2 bg-card text-xs font-semibold uppercase tracking-wider transition ${
              showVideo
                ? "border-primary text-primary"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            <Play className="h-5 w-5 fill-current" />
            <span>{lang === "tr" ? "VİDEO" : "VIDEO"}</span>
          </button>
        )}
      </div>

      {/* Title, Badges & Share / Direct Link */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-primary">{car.brand}</p>
          <h3 className="text-3xl font-semibold md:text-4xl">{car.title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs uppercase tracking-wider">
          <span className="border border-border bg-background px-3 py-1">{car.year}</span>
          <span className="border border-border bg-background px-3 py-1">
            {car.km.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")} KM
          </span>
          <span className="border border-border bg-background px-3 py-1">
            {translateTerm(car.fuel, lang)}
          </span>
          <span className="border border-border bg-background px-3 py-1">
            {translateTerm(car.gear, lang)}
          </span>
          <button
            onClick={copyShareUrl}
            className="inline-flex cursor-pointer items-center gap-1 border border-primary/50 bg-background px-2.5 py-1 text-primary transition hover:bg-primary hover:text-primary-foreground"
            title="İlan Bağlantısını Kopyala"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>
              {copied
                ? lang === "tr"
                  ? "Kopyalandı!"
                  : "Copied!"
                : lang === "tr"
                  ? "Paylaş"
                  : "Share"}
            </span>
          </button>
          <Link
            to="/arac/$slug"
            params={{ slug: car.id }}
            className="inline-flex items-center gap-1 border border-border bg-background px-2.5 py-1 text-muted-foreground transition hover:border-primary hover:text-primary"
            title="Tam Sayfa İlan Görünümü"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {car.description && (
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          {car.description[lang]}
        </p>
      )}

      {/* Modal Detail Tabs (Admin-Configurable) */}
      <div className="mb-6 flex border-b border-border">
        {settings.modalShowSpecsTab && (
          <button
            onClick={() => setActiveTab("specs")}
            className={`cursor-pointer border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === "specs"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang === "tr" ? "Teknik & Ekspertiz" : "Specs & Inspection"}
          </button>
        )}
        {settings.modalShowExtrasTab && (
          <button
            onClick={() => setActiveTab("extras")}
            className={`cursor-pointer border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === "extras"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang === "tr"
              ? `Donanım & Opsiyonlar (${localizedExtras.length})`
              : `Equipment & Options (${localizedExtras.length})`}
          </button>
        )}
        {settings.modalShowOfferTab && !isSold && (
          <button
            onClick={() => setActiveTab("offer")}
            className={`cursor-pointer border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === "offer"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.form}
          </button>
        )}
      </div>

      {activeTab === "specs" && settings.modalShowSpecsTab && (
        <table className="mb-6 w-full text-sm">
          <tbody>
            {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
              <tr key={k} className="border-b border-border">
                <td className="py-2.5 text-muted-foreground">{labels[k]}</td>
                <td className="py-2.5 text-right font-medium">
                  {translateTerm(car.specs[k], lang)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeTab === "extras" && settings.modalShowExtrasTab && (
        <div className="mb-6 grid gap-2.5 sm:grid-cols-2">
          {(localizedExtras.length > 0
            ? localizedExtras
            : [translateTerm(car.specs.package, lang), translateTerm(car.specs.expertise, lang)]
          ).map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 border border-border/60 bg-background/50 px-3.5 py-2.5 text-xs"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "offer" && settings.modalShowOfferTab && !isSold && (
        <div className="mb-6">
          <QuickOfferForm
            carTitle={car.title}
            t={t}
            lang={lang}
            autoWhatsApp={settings.whatsappAutoOpenOnForm}
          />
        </div>
      )}

      {/* Action Buttons */}
      {isSold ? (
        <div className="border border-destructive/40 bg-destructive/10 p-4 text-center text-xs font-semibold uppercase tracking-widest text-destructive">
          {t.soldBtn}
        </div>
      ) : (
        <div className={`grid gap-3 ${activeTab === "offer" ? "grid-cols-2" : "sm:grid-cols-3"}`}>
          <a
            href={waLink(car.title)}
            target="_blank"
            rel="noreferrer"
            className={goldBtn}
          >
            <MessageCircle className="h-4 w-4" />
            {t.waQuote}
          </a>
          <a href={`tel:+${PHONE_RAW}`} className={outlineBtn}>
            <Phone className="h-4 w-4" />
            {t.call}
          </a>
          {activeTab !== "offer" && (
            <button
              onClick={() =>
                !settings.modalShowOfferTab
                  ? onOffer()
                  : setActiveTab("offer")
              }
              className={outlineBtn}
            >
              <FileText className="h-4 w-4" />
              {t.form}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
