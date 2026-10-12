import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MessageCircle, Phone, Instagram, X, Search, FileText } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { BRANDS, CARS, INSTAGRAM, PHONE, PHONE_RAW, T, waLink, type Car, type Lang } from "@/lib/bycar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ByCar — Exclusive Automotive | Luxury Without Borders" },
      { name: "description", content: "Ferrari, Lamborghini, Rolls-Royce ve daha fazlası. Özel koleksiyon ve VIP araç ithalatı." },
      { property: "og:title", content: "ByCar — Exclusive Automotive" },
      { property: "og:description", content: "Lüksün Yeni Adresi. Dünyanın en seçkin otomobilleri, sizin için." },
    ],
  }),
  component: Index,
});

const ids = ["koleksiyon", "ithalat", "surec", "kurucu", "iletisim"];
const goldBtn = "inline-flex items-center justify-center gap-2 bg-gold text-primary-foreground px-6 py-3 text-sm font-semibold tracking-wider uppercase shadow-gold hover:brightness-110 transition disabled:opacity-40 disabled:pointer-events-none";
const outlineBtn = "inline-flex items-center justify-center gap-2 border border-primary text-primary bg-background/60 px-6 py-3 text-sm font-semibold tracking-wider uppercase hover:bg-primary hover:text-primary-foreground transition";
const input = "w-full bg-background border border-input px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground";

function Index() {
  const [lang, setLang] = useState<Lang>("tr");
  const t = T[lang];
  const [brand, setBrand] = useState("");
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [body, setBody] = useState("");
  const [fuel, setFuel] = useState("");
  const [gear, setGear] = useState("");
  const [detail, setDetail] = useState<Car | null>(null);
  const [offerFor, setOfferFor] = useState<string | null>(null);

  const list = useMemo(
    () =>
      CARS.filter(
        (c) =>
          (!brand || c.brand === brand) &&
          (!year || String(c.year) === year) &&
          (!body || c.body === body) &&
          (!fuel || c.fuel === fuel) &&
          (!gear || c.gear === gear) &&
          c.title.toLowerCase().includes(q.toLowerCase()),
      ),
    [brand, q, year, body, fuel, gear],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <a href="#" className="leading-none">
            <div className="font-display text-2xl font-bold tracking-[0.3em]">BYCAR</div>
            <div className="text-[9px] tracking-[0.35em] text-primary">EXCLUSIVE AUTOMOTIVE</div>
          </a>
          <nav className="hidden gap-6 text-xs uppercase tracking-widest lg:flex">
            {t.nav.map((n, i) => (
              <a key={n} href={`#${ids[i]}`} className="text-muted-foreground hover:text-primary">{n}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex border border-border text-xs">
              {(["tr", "en"] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 uppercase ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>
              ))}
            </div>
            <a href={waLink()} target="_blank" rel="noreferrer" className="hidden items-center gap-2 border border-primary px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground sm:inline-flex">
              <MessageCircle className="h-4 w-4" /> VIP WhatsApp
            </a>
          </div>
        </div>
      </header>

      <section className="relative flex min-h-screen items-end overflow-hidden">
        <img src={hero} alt="ByCar hypercar" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-24">
          <p className="mb-4 text-xs tracking-[0.5em] text-primary">EXCLUSIVE AUTOMOTIVE</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-none md:text-8xl">{t.heroTitle}</h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">{t.heroSub}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#koleksiyon" className={goldBtn}>{t.explore}</a>
            <a href="#ithalat" className={outlineBtn}>{t.importReq}</a>
          </div>
        </div>
      </section>

      <section id="koleksiyon" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24">
        <SectionTitle kicker="Collection" title={t.collection} />
        <div className="mb-6 flex flex-wrap gap-2">
          {["", ...BRANDS].map((b) => (
            <button key={b} onClick={() => setBrand(b)} className={`border px-4 py-2 text-xs uppercase tracking-wider ${brand === b ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>{b || t.all}</button>
          ))}
        </div>
        <div className="mb-10 grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className={`${input} pl-10`} />
          </div>
          <Sel v={year} set={setYear} label={lang === "tr" ? "Model Yılı" : "Year"} opts={["2024", "2023", "2022"]} />
          <Sel v={body} set={setBody} label={lang === "tr" ? "Kasa Tipi" : "Body"} opts={["Coupe", "SUV", "Sedan", "Cabrio"]} />
          <div className="grid grid-cols-2 gap-3">
            <Sel v={fuel} set={setFuel} label={lang === "tr" ? "Yakıt" : "Fuel"} opts={["Benzin", "Hibrit", "Elektrik", "Dizel"]} />
            <Sel v={gear} set={setGear} label={lang === "tr" ? "Vites" : "Gear"} opts={["Otomatik", "Manuel"]} />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <article key={c.id} className="group relative overflow-hidden border border-border bg-card">
              <button onClick={() => !c.sold && setDetail(c)} className="block w-full overflow-hidden">
                <img src={c.images[0]} alt={c.title} loading="lazy" width={1280} height={832} className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-105" />
              </button>
              <div className="p-5">
                <div className="mb-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {[c.year, `${c.km.toLocaleString("tr-TR")} KM`, c.fuel, c.gear].map((x) => (
                    <span key={x} className="border border-border px-2 py-1">{x}</span>
                  ))}
                </div>
                <h3 className="mb-5 text-2xl font-semibold">{c.title}</h3>
                <a href={waLink(c.title)} target="_blank" rel="noreferrer" aria-disabled={c.sold} className={`${goldBtn} w-full ${c.sold ? "pointer-events-none opacity-40" : ""}`}>
                  <MessageCircle className="h-4 w-4" /> {t.quote}
                </a>
              </div>
              {c.sold && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 grayscale">
                  <span className="rotate-[-12deg] border-2 border-destructive bg-background/80 px-6 py-2 text-2xl font-bold tracking-[0.4em] text-destructive">{t.sold}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section id="ithalat" className="scroll-mt-20 border-y border-border bg-card py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-2">
          <div>
            <SectionTitle kicker="Private Import" title={t.importTitle} />
            <p className="text-muted-foreground">{t.importSub}</p>
          </div>
          <SimpleForm t={t} fields={[t.f.model, t.f.year, "budget", t.f.country, t.f.name, t.f.phone]} />
        </div>
      </section>

      <section id="surec" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24">
        <SectionTitle kicker="Process" title={t.process} />
        <div className="grid gap-6 md:grid-cols-4">
          {t.steps.map(([h, d], i) => (
            <div key={h} className="border border-border p-6">
              <div className="mb-4 font-display text-5xl text-gold">0{i + 1}</div>
              <h3 className="mb-2 text-xl font-semibold">{h}</h3>
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="kurucu" className="scroll-mt-20 border-t border-border bg-card py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <SectionTitle kicker="Founder" title={t.founder} center />
          <p className="text-lg leading-relaxed text-muted-foreground">{t.founderText}</p>
          <div className="mt-8 font-display text-3xl">Burak Yılmaz</div>
          <div className="text-xs tracking-[0.3em] text-primary">FOUNDER & CEO | BYCAR GLOBAL</div>
        </div>
      </section>

      <footer id="iletisim" className="scroll-mt-20 border-t border-border py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-3">
          <div>
            <div className="font-display text-2xl font-bold tracking-[0.3em]">BYCAR</div>
            <p className="mt-2 text-sm text-muted-foreground">Exclusive Automotive | Luxury Without Borders</p>
          </div>
          <div className="space-y-2 text-sm">
            <a href={`tel:+${PHONE_RAW}`} className="flex items-center gap-2 hover:text-primary"><Phone className="h-4 w-4" />{PHONE}</a>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary"><Instagram className="h-4 w-4" />@bycar.eu</a>
            <div className="text-muted-foreground">bycarglobal.com</div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>{t.faq}</div>
            <div>{t.privacy}</div>
            <Link to="/admin" className="block hover:text-primary">Yönetim Paneli</Link>
          </div>
        </div>
      </footer>

      {detail && <DetailModal car={detail} t={t} lang={lang} onClose={() => setDetail(null)} onOffer={() => setOfferFor(detail.title)} />}
      {offerFor && (
        <Modal onClose={() => setOfferFor(null)}>
          <h3 className="mb-1 text-3xl font-semibold">{t.form}</h3>
          <p className="mb-6 text-sm text-primary">{offerFor}</p>
          <SimpleForm t={t} fields={[t.f.name, t.f.phone, t.f.offer]} />
        </Modal>
      )}
    </div>
  );
}

function SectionTitle({ kicker, title, center }: { kicker: string; title: string; center?: boolean }) {
  return (
    <div className={`mb-10 ${center ? "text-center" : ""}`}>
      <p className="mb-2 text-xs uppercase tracking-[0.5em] text-primary">{kicker}</p>
      <h2 className="text-4xl font-semibold md:text-6xl">{title}</h2>
    </div>
  );
}

function Sel({ v, set, label, opts }: { v: string; set: (s: string) => void; label: string; opts: string[] }) {
  return (
    <select value={v} onChange={(e) => set(e.target.value)} className={input}>
      <option value="">{label}</option>
      {opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

function SimpleForm({ t, fields }: { t: (typeof T)["tr"]; fields: string[] }) {
  const [done, setDone] = useState(false);
  if (done) return <p className="border border-primary p-6 text-primary">{t.sent}</p>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) =>
        f === "budget" ? (
          <div key={f} className="flex gap-2">
            <input required placeholder={t.f.budget} className={input} />
            <select className={`${input} w-24`}><option>EUR</option><option>USD</option><option>TL</option></select>
          </div>
        ) : f === t.f.offer ? (
          <textarea key={f} required placeholder={f} rows={3} className={`${input} sm:col-span-2`} />
        ) : (
          <input key={f} required placeholder={f} className={input} />
        ),
      )}
      <button className={`${goldBtn} sm:col-span-2`}>{t.send}</button>
    </form>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur" onClick={onClose}>
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto border border-border bg-popover p-6" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-primary" aria-label="Close"><X /></button>
        {children}
      </div>
    </div>
  );
}

function DetailModal({ car, t, lang, onClose, onOffer }: { car: Car; t: (typeof T)["tr"]; lang: Lang; onClose: () => void; onOffer: () => void }) {
  const [img, setImg] = useState(0);
  const labels = lang === "tr"
    ? { expertise: "Ekspertiz", package: "Donanım Paketi", tramer: "Tramer", power: "Motor Gücü", color: "Renk" }
    : { expertise: "Inspection", package: "Package", tramer: "Damage Record", power: "Power", color: "Color" };
  return (
    <Modal onClose={onClose}>
      <img src={car.images[img]} alt={car.title} className="mb-3 aspect-[16/10] w-full object-cover" />
      <div className="mb-6 flex gap-2">
        {car.images.map((s, i) => (
          <button key={i} onClick={() => setImg(i)} className={`w-20 border-2 ${i === img ? "border-primary" : "border-transparent opacity-60"}`}>
            <img src={s} alt="" className="aspect-video w-full object-cover" />
          </button>
        ))}
      </div>
      <h3 className="mb-4 text-4xl font-semibold">{car.title}</h3>
      <table className="mb-6 w-full text-sm">
        <tbody>
          {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
            <tr key={k} className="border-b border-border">
              <td className="py-2 text-muted-foreground">{labels[k]}</td>
              <td className="py-2 text-right">{car.specs[k]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid gap-3 sm:grid-cols-3">
        <a href={waLink(car.title)} target="_blank" rel="noreferrer" className={goldBtn}><MessageCircle className="h-4 w-4" />{t.waQuote}</a>
        <a href={`tel:+${PHONE_RAW}`} className={outlineBtn}><Phone className="h-4 w-4" />{t.call}</a>
        <button onClick={onOffer} className={outlineBtn}><FileText className="h-4 w-4" />{t.form}</button>
      </div>
    </Modal>
  );
}
