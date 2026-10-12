import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  type Car,
  type Lang,
} from "@/lib/bycar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ByCar — Exclusive Automotive | Luxury Without Borders" },
      {
        name: "description",
        content:
          "Cupra, Ferrari, Porsche, Lamborghini, Rolls-Royce, Mercedes-AMG, BMW M, Audi ve Bentley. Özel koleksiyon ve VIP araç ithalatı.",
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
  const { cars } = useByCarStore();
  const [lang, setLang] = useState<Lang>("tr");
  const t = T[lang];
  const [brand, setBrand] = useState("");
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [body, setBody] = useState("");
  const [fuel, setFuel] = useState("");
  const [gear, setGear] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "sold">("all");
  const [detail, setDetail] = useState<Car | null>(null);
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showKvkk, setShowKvkk] = useState(false);

  const visibleCars = useMemo(
    () => cars.filter((c) => c.status !== "draft"),
    [cars],
  );

  const availableYears = useMemo(
    () =>
      Array.from(new Set(visibleCars.map((c) => String(c.year)))).sort((a, b) =>
        Number(b) - Number(a),
      ),
    [visibleCars],
  );

  const list = useMemo(
    () =>
      visibleCars.filter((c) => {
        const isSold = Boolean(c.sold || c.status === "sold");
        if (statusFilter === "available" && isSold) return false;
        if (statusFilter === "sold" && !isSold) return false;
        return (
          (!brand || c.brand === brand) &&
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
              <div className="text-[9px] tracking-[0.35em] text-primary">EXCLUSIVE AUTOMOTIVE</div>
            </div>
          </a>
          <nav className="hidden gap-6 text-xs uppercase tracking-widest lg:flex">
            {t.nav.map((n, i) => (
              <a
                key={n}
                href={`#${ids[i]}`}
                className="text-muted-foreground transition hover:text-primary"
              >
                {n}
              </a>
            ))}
          </nav>
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
            <a
              href={waLink()}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 border border-primary px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground sm:inline-flex"
            >
              <MessageCircle className="h-4 w-4" /> VIP WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative flex min-h-screen items-end overflow-hidden">
        <img
          src={hero}
          alt="ByCar hypercar"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/15" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-24">
          <p className="mb-4 text-xs tracking-[0.5em] text-primary">EXCLUSIVE AUTOMOTIVE</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-none md:text-8xl">
            {t.heroTitle}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t.heroSub}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#koleksiyon" className={goldBtn}>
              {t.explore}
            </a>
            <a href="#ithalat" className={outlineBtn}>
              {t.importReq}
            </a>
          </div>
        </div>
      </section>

      {/* COLLECTION */}
      <section id="koleksiyon" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24">
        <SectionTitle kicker="Collection" title={t.collection} />

        {/* Brand Pills */}
        <div className="mb-6 flex flex-wrap gap-2">
          {["", ...BRANDS].map((b) => (
            <button
              key={b}
              onClick={() => setBrand(b)}
              className={`cursor-pointer border px-4 py-2 text-xs uppercase tracking-wider transition ${
                brand === b
                  ? "border-primary bg-primary font-semibold text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {b || t.all}
            </button>
          ))}
        </div>

        {/* Advanced Filter Bar */}
        <div className="mb-10 grid gap-3 md:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="
              pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground
            " />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.search}
              className={`${input} pl-10`}
            />
          </div>
          <Sel
            v={year}
            set={setYear}
            label={lang === "tr" ? "Model Yılı" : "Model Year"}
            opts={availableYears}
          />
          <Sel
            v={body}
            set={setBody}
            label={lang === "tr" ? "Kasa Tipi" : "Body Type"}
            opts={["Coupe", "SUV", "Sedan", "Cabrio"]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Sel
              v={fuel}
              set={setFuel}
              label={lang === "tr" ? "Yakıt" : "Fuel"}
              opts={["Benzin", "Hibrit", "Elektrik", "Dizel"]}
            />
            <Sel
              v={gear}
              set={setGear}
              label={lang === "tr" ? "Vites" : "Gear"}
              opts={["Otomatik", "Manuel"]}
            />
          </div>
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
        </div>

        {/* Vehicle Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const isSold = Boolean(c.sold || c.status === "sold");
            return (
              <article
                key={c.id}
                className="group relative flex flex-col overflow-hidden border border-border bg-card transition hover:border-primary/60"
              >
                <button
                  onClick={() => setDetail(c)}
                  className="relative block w-full cursor-pointer overflow-hidden text-left"
                >
                  <img
                    src={c.images[0]}
                    alt={c.title}
                    loading="lazy"
                    width={1280}
                    height={832}
                    className={`aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-105 ${
                      isSold ? "grayscale-[60%]" : ""
                    }`}
                  />
                  {/* Angle / Video Badge */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-background/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary backdrop-blur-sm">
                    <span>{c.images.length} FOTOĞRAF</span>
                    {c.video && (
                      <span className="inline-flex items-center gap-1 border-l border-border pl-1.5 text-foreground">
                        <Play className="h-2.5 w-2.5 fill-primary text-primary" /> VİDEO
                      </span>
                    )}
                  </div>
                  {/* Sold Overlay Badge */}
                  {isSold && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/55">
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
                        `${c.km.toLocaleString("tr-TR")} KM`,
                        c.fuel,
                        c.gear,
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
                      {c.specs.power} · {c.specs.color}
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
                        className={`${goldBtn} !px-3 !text-xs`}
                      >
                        <MessageCircle className="h-3.5 w-3.5 shrink-0" /> {t.quote}
                      </a>
                      <button
                        onClick={() => setDetail(c)}
                        className={`${outlineBtn} !px-3 !text-xs`}
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
          <ImportRequestForm t={t} />
        </div>
      </section>

      {/* PROCESS */}
      <section id="surec" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24">
        <SectionTitle kicker="Process" title={t.process} />
        <div className="grid gap-6 md:grid-cols-4">
          {t.steps.map(([h, d], i) => (
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

      {/* FOUNDER'S VISION */}
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
            <SectionTitle kicker="Founder & Vision" title={t.founder} />
            <div className="space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg">
              {t.founderParagraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
            <div className="mt-8 border-l-2 border-primary pl-4 font-display text-2xl italic text-primary">
              {t.founderSlogan}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ ACCORDION */}
      <section id="sss" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-24">
        <SectionTitle kicker="FAQ" title={t.faq} center />
        <p className="-mt-6 mb-10 text-center text-sm text-muted-foreground">
          {t.faqSub}
        </p>
        <div className="divide-y divide-border border border-border bg-card">
          {t.faqs.map(([qText, aText], idx) => {
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

      {/* FOOTER */}
      <footer id="iletisim" className="scroll-mt-20 border-t border-border bg-card/50 py-16">
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
          </div>
          <div className="space-y-2.5 text-sm">
            <a
              href={`tel:+${PHONE_RAW}`}
              className="flex items-center gap-2 transition hover:text-primary"
            >
              <Phone className="h-4 w-4 text-primary" />
              {PHONE}
            </a>
            <a
              href={INSTAGRAM}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 transition hover:text-primary"
            >
              <Instagram className="h-4 w-4 text-primary" />
              @bycar.eu
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
              <Lock className="h-3.5 w-3.5" /> VIP Yönetim Paneli (Admin)
            </Link>
          </div>
        </div>
      </footer>

      {/* FLOATING VIP WHATSAPP BUTTON */}
      <a
        href={waLink()}
        target="_blank"
        rel="noreferrer"
        aria-label="VIP WhatsApp İletişim"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full border border-primary bg-background/95 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-primary shadow-gold backdrop-blur transition hover:scale-105 hover:bg-primary hover:text-primary-foreground"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">VIP WhatsApp</span>
      </a>

      {/* VEHICLE DETAIL MODAL */}
      {detail && (
        <DetailModal
          car={detail}
          t={t}
          lang={lang}
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
          <QuickOfferForm carTitle={offerFor} t={t} />
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
  opts: string[];
}) {
  return (
    <select value={v} onChange={(e) => set(e.target.value)} className={input}>
      <option value="">{label}</option>
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function ImportRequestForm({ t }: { t: (typeof T)["tr"] }) {
  const [done, setDone] = useState(false);
  if (done) {
    return (
      <div className="flex flex-col items-start justify-center border border-primary bg-background/60 p-8">
        <CheckCircle2 className="mb-3 h-8 w-8 text-primary" />
        <p className="text-base text-foreground">{t.sent}</p>
        <button
          onClick={() => setDone(false)}
          className="mt-4 text-xs uppercase tracking-wider text-primary underline cursor-pointer"
        >
          Yeni Talep Gönder
        </button>
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
        addStoredInquiry({
          type: "İthalat",
          name,
          phone,
          car: `${model} (${year})`,
          offerOrBudget: `${budget} ${currency} — ${country}`,
        });
        setDone(true);
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

function QuickOfferForm({
  carTitle,
  t,
}: {
  carTitle: string;
  t: (typeof T)["tr"];
}) {
  const [done, setDone] = useState(false);
  if (done) {
    return (
      <div className="border border-primary bg-background/50 p-6 text-primary">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-5 w-5" />
          <span>{t.sent}</span>
        </div>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        addStoredInquiry({
          type: "Teklif",
          name: String(fd.get("name") || ""),
          phone: String(fd.get("phone") || ""),
          car: carTitle,
          offerOrBudget: String(fd.get("offer") || ""),
        });
        setDone(true);
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-border bg-popover p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 cursor-pointer bg-background/80 p-1.5 text-muted-foreground transition hover:text-primary"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

function DetailModal({
  car,
  t,
  lang,
  onClose,
  onOffer,
}: {
  car: Car;
  t: (typeof T)["tr"];
  lang: Lang;
  onClose: () => void;
  onOffer: () => void;
}) {
  const [img, setImg] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [activeTab, setActiveTab] = useState<"specs" | "extras" | "offer">("specs");
  const isSold = Boolean(car.sold || car.status === "sold");

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

  const prevImg = () => {
    setShowVideo(false);
    setImg((prev) => (prev === 0 ? car.images.length - 1 : prev - 1));
  };
  const nextImg = () => {
    setShowVideo(false);
    setImg((prev) => (prev === car.images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Modal onClose={onClose}>
      {/* Main Media Viewer (Multi-Angle Photo or MP4 Video) */}
      <div className="relative mb-3 overflow-hidden border border-border bg-background">
        {showVideo && car.video ? (
          <video
            src={car.video}
            controls
            autoPlay
            className="aspect-[16/10] w-full bg-black object-contain"
          />
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
              className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer border border-border bg-background/80 p-2 text-foreground transition hover:border-primary hover:text-primary"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImg}
              aria-label="Sonraki Açı"
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border border-border bg-background/80 p-2 text-foreground transition hover:border-primary hover:text-primary"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="absolute bottom-3 left-3 bg-background/85 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
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
            <span>VİDEO</span>
          </button>
        )}
      </div>

      {/* Title & Badges */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-primary">{car.brand}</p>
          <h3 className="text-3xl font-semibold md:text-4xl">{car.title}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs uppercase tracking-wider">
          <span className="border border-border bg-background px-3 py-1">{car.year}</span>
          <span className="border border-border bg-background px-3 py-1">
            {car.km.toLocaleString("tr-TR")} KM
          </span>
          <span className="border border-border bg-background px-3 py-1">{car.fuel}</span>
          <span className="border border-border bg-background px-3 py-1">{car.gear}</span>
        </div>
      </div>

      {car.description && (
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          {car.description[lang]}
        </p>
      )}

      {/* Modal Detail Tabs */}
      <div className="mb-6 flex border-b border-border">
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
        <button
          onClick={() => setActiveTab("extras")}
          className={`cursor-pointer border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition ${
            activeTab === "extras"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {lang === "tr"
            ? `Donanım & Opsiyonlar (${car.extras?.length || 0})`
            : `Equipment & Options (${car.extras?.length || 0})`}
        </button>
        {!isSold && (
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

      {activeTab === "specs" && (
        <table className="mb-6 w-full text-sm">
          <tbody>
            {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
              <tr key={k} className="border-b border-border">
                <td className="py-2.5 text-muted-foreground">{labels[k]}</td>
                <td className="py-2.5 text-right font-medium">{car.specs[k]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeTab === "extras" && (
        <div className="mb-6 grid gap-2.5 sm:grid-cols-2">
          {(car.extras && car.extras.length > 0
            ? car.extras
            : [car.specs.package, car.specs.expertise]
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

      {activeTab === "offer" && !isSold && (
        <div className="mb-6">
          <QuickOfferForm carTitle={car.title} t={t} />
        </div>
      )}

      {/* Action Buttons */}
      {isSold ? (
        <div className="border border-destructive/40 bg-destructive/10 p-4 text-center text-xs font-semibold uppercase tracking-widest text-destructive">
          {t.soldBtn}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
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
          <button
            onClick={() =>
              activeTab === "offer" ? onOffer() : setActiveTab("offer")
            }
            className={outlineBtn}
          >
            <FileText className="h-4 w-4" />
            {t.form}
          </button>
        </div>
      )}
    </Modal>
  );
}
