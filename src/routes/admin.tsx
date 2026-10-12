import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CARS } from "@/lib/bycar";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Yönetim Paneli — ByCar" },
      { name: "description", content: "ByCar araç ve teklif yönetim paneli." },
      { property: "og:title", content: "Yönetim Paneli — ByCar" },
      { property: "og:description", content: "Araç ekleme ve gelen teklifler." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const input = "w-full bg-background border border-input px-4 py-3 text-sm outline-none focus:border-primary";
const inbox = [
  { type: "Teklif", name: "Mehmet K.", car: "Ferrari SF90 Stradale", phone: "+90 532 *** ** 12", time: "10 dk önce" },
  { type: "İthalat", name: "Selin A.", car: "Mercedes-AMG G63 2024 — Dubai", phone: "+90 555 *** ** 48", time: "1 saat önce" },
  { type: "Teklif", name: "Ahmet Y.", car: "Rolls-Royce Ghost Black Badge", phone: "+90 533 *** ** 07", time: "Dün" },
];

function Admin() {
  const [tab, setTab] = useState<"add" | "inbox">("add");
  const [cars, setCars] = useState(CARS.map((c) => ({ title: c.title, status: c.sold ? "Satıldı" : "Satışta" })));
  const [saved, setSaved] = useState(false);
  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-semibold">Yönetim Paneli</h1>
          <Link to="/" className="text-sm text-primary">← Siteye dön</Link>
        </div>
        <div className="mb-6 flex border border-border">
          {(["add", "inbox"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 px-4 py-3 text-xs uppercase tracking-wider ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {k === "add" ? "Araç Ekle" : "Teklifler & İthalat Talepleri"}
            </button>
          ))}
        </div>
        {tab === "add" ? (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                setCars([{ title: `${f.get("brand")} ${f.get("model")}`, status: String(f.get("status")) }, ...cars]);
                setSaved(true);
                e.currentTarget.reset();
              }}
              className="grid gap-3 border border-border bg-card p-6 sm:grid-cols-2"
            >
              <input name="brand" required placeholder="Marka" className={input} />
              <input name="model" required placeholder="Model" className={input} />
              <input name="year" required type="number" placeholder="Yıl" className={input} />
              <input name="km" required type="number" placeholder="KM" className={input} />
              <select name="status" className={input}><option>Satışta</option><option>Satıldı</option><option>Taslak</option></select>
              <input type="file" multiple accept="image/*" className={`${input} file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground`} />
              <button className="bg-gold px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground sm:col-span-2">Aracı Kaydet</button>
              {saved && <p className="text-sm text-primary sm:col-span-2">Araç listeye eklendi (prototip).</p>}
            </form>
            <ul className="mt-6 divide-y divide-border border border-border">
              {cars.map((c, i) => (
                <li key={i} className="flex justify-between px-4 py-3 text-sm"><span>{c.title}</span><span className="text-primary">{c.status}</span></li>
              ))}
            </ul>
          </>
        ) : (
          <ul className="space-y-3">
            {inbox.map((m, i) => (
              <li key={i} className="border border-border bg-card p-4">
                <div className="mb-1 flex justify-between text-xs"><span className="text-primary uppercase tracking-wider">{m.type}</span><span className="text-muted-foreground">{m.time}</span></div>
                <div className="font-semibold">{m.car}</div>
                <div className="text-sm text-muted-foreground">{m.name} · {m.phone}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
