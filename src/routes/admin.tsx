import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Lock,
  Plus,
  Trash2,
  Edit3,
  MessageCircle,
  CheckCircle2,
  RotateCcw,
  Star,
  Image as ImageIcon,
  LogOut,
} from "lucide-react";
import {
  BRANDS,
  useByCarStore,
  type Car,
  type CarStatus,
  type Inquiry,
} from "@/lib/bycar";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "VIP Yönetim Paneli — ByCar Global" },
      { name: "description", content: "ByCar araç koleksiyonu ve VIP talep yönetim paneli." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const input =
  "w-full bg-background border border-input px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground";
const goldBtn =
  "inline-flex items-center justify-center gap-2 bg-gold text-primary-foreground px-6 py-3 text-xs font-semibold tracking-wider uppercase shadow-gold hover:brightness-110 transition cursor-pointer";

function Admin() {
  const { cars, inquiries, updateCars, resetCars, updateInquiries } = useByCarStore();
  const [authed, setAuthed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("bycar_admin_auth") === "1";
  });
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);

  const [tab, setTab] = useState<"fleet" | "add" | "inbox">("fleet");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState("");

  // Form states for Add / Edit Vehicle
  const [brand, setBrand] = useState("Cupra");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("2024");
  const [km, setKm] = useState("0");
  const [fuel, setFuel] = useState<Car["fuel"]>("Benzin");
  const [gear, setGear] = useState<Car["gear"]>("Otomatik");
  const [body, setBody] = useState<Car["body"]>("Coupe");
  const [status, setStatus] = useState<CarStatus>("active");
  const [power, setPower] = useState("");
  const [color, setColor] = useState("");
  const [pkg, setPkg] = useState("");
  const [expertise, setExpertise] = useState("Hatasız / Boyasız / Orijinal");
  const [tramer, setTramer] = useState("Yok");
  const [descTr, setDescTr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [extrasText, setExtrasText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imgUrlInput, setImgUrlInput] = useState("");

  const startEdit = (c: Car) => {
    setEditingId(c.id);
    setBrand(c.brand);
    setTitle(c.title);
    setYear(String(c.year));
    setKm(String(c.km));
    setFuel(c.fuel);
    setGear(c.gear);
    setBody(c.body);
    setStatus(c.status || (c.sold ? "sold" : "active"));
    setPower(c.specs.power);
    setColor(c.specs.color);
    setPkg(c.specs.package);
    setExpertise(c.specs.expertise);
    setTramer(c.specs.tramer);
    setDescTr(c.description?.tr || "");
    setDescEn(c.description?.en || "");
    setExtrasText((c.extras || []).join("\n"));
    setImages(c.images);
    setTab("add");
  };

  const clearForm = () => {
    setEditingId(null);
    setBrand("Porsche");
    setTitle("");
    setYear("2025");
    setKm("0");
    setFuel("Benzin");
    setGear("Otomatik");
    setBody("Coupe");
    setStatus("active");
    setPower("");
    setColor("");
    setPkg("");
    setExpertise("Hatasız / Boyasız / Orijinal");
    setTramer("Yok");
    setDescTr("");
    setDescEn("");
    setExtrasText("");
    setImages([]);
    setImgUrlInput("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const addImageUrl = () => {
    const trimmed = imgUrlInput.trim();
    if (!trimmed) return;
    setImages((prev) => [...prev, trimmed]);
    setImgUrlInput("");
  };

  const setAsCover = (idx: number) => {
    setImages((prev) => {
      const chosen = prev[idx];
      return [chosen, ...prev.filter((_, i) => i !== idx)];
    });
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStatusChange = (id: string, nextStatus: CarStatus) => {
    const updated = cars.map((c) =>
      c.id === id
        ? { ...c, status: nextStatus, sold: nextStatus === "sold" }
        : c,
    );
    updateCars(updated);
  };

  const handleDeleteCar = (id: string) => {
    updateCars(cars.filter((c) => c.id !== id));
  };

  const handleInquiryStatus = (id: string, nextStatus: Inquiry["status"]) => {
    updateInquiries(
      inquiries.map((m) => (m.id === id ? { ...m, status: nextStatus } : m)),
    );
  };

  const handleDeleteInquiry = (id: string) => {
    updateInquiries(inquiries.filter((m) => m.id !== id));
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md border border-border bg-card p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src="/bycar-logo.jpg"
              alt="ByCar"
              className="mb-4 h-16 w-16 rounded-full border border-primary object-cover"
            />
            <p className="text-[10px] uppercase tracking-[0.4em] text-primary">
              BYCAR GLOBAL
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">
              VIP Yönetim Girişi
            </h1>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pw === "bycar2024") {
                window.sessionStorage.setItem("bycar_admin_auth", "1");
                setAuthed(true);
                setPwErr(false);
              } else {
                setPwErr(true);
              }
            }}
            className="space-y-4"
          >
            <div>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Yönetici Şifresi"
                className={input}
                autoFocus
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Demo Giriş Şifresi:{" "}
                <code className="text-primary font-semibold">bycar2024</code>
              </p>
              {pwErr && (
                <p className="mt-1 text-xs text-destructive">
                  Hatalı şifre. Lütfen bycar2024 girin.
                </p>
              )}
            </div>
            <button type="submit" className={`${goldBtn} w-full`}>
              <Lock className="h-4 w-4" /> Panele Giriş Yap
            </button>
            <Link
              to="/"
              className="block text-center text-xs text-muted-foreground hover:text-primary"
            >
              ← Vitrine Geri Dön
            </Link>
          </form>
        </div>
      </div>
    );
  }

  const newInquiriesCount = inquiries.filter((i) => i.status === "Yeni").length;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-6xl">
        {/* Top Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <img
              src="/bycar-logo.jpg"
              alt="ByCar"
              className="h-12 w-12 rounded-full border border-primary object-cover"
            />
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-primary">
                BYCAR GLOBAL · VIP ADMIN
              </p>
              <h1 className="font-display text-3xl font-semibold md:text-4xl">
                Koleksiyon & Talep Yönetimi
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="border border-primary px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              ← Canlı Vitrine Dön
            </Link>
            <button
              onClick={() => {
                window.sessionStorage.removeItem("bycar_admin_auth");
                setAuthed(false);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 border border-border px-3 py-2 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> Çıkış
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8 grid grid-cols-3 border border-border bg-card">
          <button
            onClick={() => setTab("fleet")}
            className={`cursor-pointer px-4 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
              tab === "fleet"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            1. Araç Yönetimi ({cars.length})
          </button>
          <button
            onClick={() => {
              if (tab !== "add") clearForm();
              setTab("add");
            }}
            className={`cursor-pointer px-4 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
              tab === "add"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            2. {editingId ? "Aracı Düzenle" : "Yeni Araç Ekle"}
          </button>
          <button
            onClick={() => setTab("inbox")}
            className={`cursor-pointer px-4 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
              tab === "inbox"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            3. Gelen Talepler ({inquiries.length}
            {newInquiriesCount > 0 ? ` · ${newInquiriesCount} Yeni` : ""})
          </button>
        </div>

        {/* TAB 1: FLEET MANAGEMENT */}
        {tab === "fleet" && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Durumu değiştirilen, düzenlenen veya eklenen araçlar anında ana vitrine yansır.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    clearForm();
                    setTab("add");
                  }}
                  className={goldBtn}
                >
                  <Plus className="h-4 w-4" /> Yeni Araç Ekle
                </button>
                <button
                  onClick={() => {
                    resetCars();
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Varsayılan 10 Aracı Yükle
                </button>
              </div>
            </div>

            <div className="divide-y divide-border border border-border bg-card">
              {cars.map((c) => {
                const currentStatus: CarStatus =
                  c.status || (c.sold ? "sold" : "active");
                return (
                  <div
                    key={c.id}
                    className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={c.images[0]}
                        alt={c.title}
                        className="h-16 w-28 shrink-0 border border-border object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-widest text-primary">
                            {c.brand}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {c.year} · {c.km.toLocaleString("tr-TR")} KM ·{" "}
                            {c.images.length} Açı Fotoğraf
                          </span>
                        </div>
                        <div className="font-display text-xl font-semibold">
                          {c.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.specs.power} · {c.specs.package}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(["active", "sold", "draft"] as CarStatus[]).map((st) => {
                        const labels: Record<CarStatus, string> = {
                          active: "Satışta",
                          sold: "Satıldı",
                          draft: "Taslak",
                        };
                        const active = currentStatus === st;
                        return (
                          <button
                            key={st}
                            onClick={() => handleStatusChange(c.id, st)}
                            className={`cursor-pointer border px-3 py-1.5 text-xs uppercase tracking-wider transition ${
                              active
                                ? st === "sold"
                                  ? "border-destructive bg-destructive text-destructive-foreground font-semibold"
                                  : st === "draft"
                                    ? "border-muted-foreground bg-muted text-foreground font-semibold"
                                    : "border-primary bg-primary text-primary-foreground font-semibold"
                                : "border-border text-muted-foreground hover:border-primary"
                            }`}
                          >
                            {labels[st]}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => startEdit(c)}
                        className="inline-flex cursor-pointer items-center gap-1 border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary hover:text-primary"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteCar(c.id)}
                        className="inline-flex cursor-pointer items-center gap-1 border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                        title="Aracı Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ADD / EDIT VEHICLE */}
        {tab === "add" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const finalImages =
                images.length > 0
                  ? images
                  : ["/cars/cupra/1.jpg", "/cars/cupra/2.jpg"];
              const newCar: Car = {
                id: editingId || `car-${Date.now()}`,
                brand,
                title: title || `${brand} Exclusive`,
                year: Number(year) || 2024,
                km: Number(km) || 0,
                fuel,
                gear,
                body,
                status,
                sold: status === "sold",
                images: finalImages,
                specs: {
                  power: power || "Belirtilmedi",
                  color: color || "Özel Renk",
                  package: pkg || "Exclusive Paket",
                  expertise: expertise || "Hatasız / Boyasız",
                  tramer: tramer || "Yok",
                },
                extras: extrasText
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
                description: {
                  tr: descTr || `${title} — ByCar VIP Koleksiyon Aracı.`,
                  en: descEn || `${title} — ByCar VIP Collection Vehicle.`,
                },
              };

              if (editingId) {
                updateCars(cars.map((c) => (c.id === editingId ? newCar : c)));
                setSavedMsg("Araç başarıyla güncellendi ve vitrine yansıtıldı.");
              } else {
                updateCars([newCar, ...cars]);
                setSavedMsg("Yeni araç başarıyla koleksiyona eklendi!");
              }
              setTimeout(() => setSavedMsg(""), 4000);
              clearForm();
            }}
            className="grid gap-4 border border-border bg-card p-6 sm:grid-cols-2"
          >
            <div className="sm:col-span-2 flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-2xl font-semibold">
                {editingId ? "Araç Bilgilerini Düzenle" : "Koleksiyona Yeni Araç Ekle"}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="text-xs text-primary underline cursor-pointer"
                >
                  Yeni Araç Formuna Geç
                </button>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Marka
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className={input}
              >
                {BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Araç Başlığı (Marka & Model & Paket)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Örn: Porsche 911 Turbo S Cabriolet"
                className={input}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                  Model Yılı
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                  Kilometre (KM)
                </label>
                <input
                  type="number"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  required
                  className={input}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                  Yakıt
                </label>
                <select
                  value={fuel}
                  onChange={(e) => setFuel(e.target.value as Car["fuel"])}
                  className={input}
                >
                  <option>Benzin</option>
                  <option>Hibrit</option>
                  <option>Elektrik</option>
                  <option>Dizel</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                  Vites
                </label>
                <select
                  value={gear}
                  onChange={(e) => setGear(e.target.value as Car["gear"])}
                  className={input}
                >
                  <option>Otomatik</option>
                  <option>Manuel</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                  Kasa Tipi
                </label>
                <select
                  value={body}
                  onChange={(e) => setBody(e.target.value as Car["body"])}
                  className={input}
                >
                  <option>Coupe</option>
                  <option>SUV</option>
                  <option>Sedan</option>
                  <option>Cabrio</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Motor Gücü
              </label>
              <input
                value={power}
                onChange={(e) => setPower(e.target.value)}
                placeholder="Örn: 650 HP (3.8 Boxer Twin-Turbo)"
                className={input}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Dış / İç Renk
              </label>
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Örn: Jet Siyah / Bordo Deri"
                className={input}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Donanım Paketi
              </label>
              <input
                value={pkg}
                onChange={(e) => setPkg(e.target.value)}
                placeholder="Örn: Sport Design & Karbon Paket"
                className={input}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                  Ekspertiz Durumu
                </label>
                <input
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                  Tramer Kaydı
                </label>
                <input
                  value={tramer}
                  onChange={(e) => setTramer(e.target.value)}
                  className={input}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Yayın Durumu
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CarStatus)}
                className={input}
              >
                <option value="active">Satışta (Vitrinde Aktif)</option>
                <option value="sold">Satıldı (SATILDI Rozetli)</option>
                <option value="draft">Taslak (Vitrinde Gizli)</option>
              </select>
            </div>

            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                  Araç Açıklaması (Türkçe)
                </label>
                <textarea
                  value={descTr}
                  onChange={(e) => setDescTr(e.target.value)}
                  rows={3}
                  placeholder="Yetkili servis geçmişi, kondisyon ve özel notlar..."
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                  Vehicle Description (English)
                </label>
                <textarea
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  rows={3}
                  placeholder="Official dealer history, condition and bespoke notes..."
                  className={input}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Donanım & Ekstra Özellikler (Her satıra 1 özellik yazın)
              </label>
              <textarea
                value={extrasText}
                onChange={(e) => setExtrasText(e.target.value)}
                rows={4}
                placeholder={"Karbon Seramik Frenler\nBurmester 3D Ses Sistemi\nÖn Aks Yükseltme (Lift)"}
                className={input}
              />
            </div>

            {/* Multi-Angle Photo Upload & URL Manager */}
            <div className="sm:col-span-2 border border-border bg-background/50 p-4">
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <ImageIcon className="h-4 w-4" /> Çok Açılı Fotoğraf Galerisi (Kapak Seçimli)
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className={`${input} file:mr-3 file:cursor-pointer file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary-foreground`}
                />
                <div className="flex gap-2">
                  <input
                    value={imgUrlInput}
                    onChange={(e) => setImgUrlInput(e.target.value)}
                    placeholder="veya Fotoğraf URL'si yapıştırın (https://...)"
                    className={input}
                  />
                  <button
                    type="button"
                    onClick={addImageUrl}
                    className="border border-primary px-4 text-xs font-semibold uppercase text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {images.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {images.map((src, idx) => (
                    <div
                      key={idx}
                      className={`relative w-32 border-2 bg-card p-1 ${
                        idx === 0 ? "border-primary" : "border-border"
                      }`}
                    >
                      <img
                        src={src}
                        alt=""
                        className="aspect-video w-full object-cover"
                      />
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        {idx === 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-primary">
                            <Star className="h-3 w-3 fill-primary" /> KAPAK
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAsCover(idx)}
                            className="text-muted-foreground hover:text-primary cursor-pointer"
                          >
                            Kapak Yap
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="text-destructive cursor-pointer"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className={`${goldBtn} sm:col-span-2 py-4`}>
              {editingId ? "Değişiklikleri Kaydet & Yayınla" : "Aracı Koleksiyona Kaydet"}
            </button>

            {savedMsg && (
              <div className="sm:col-span-2 flex items-center gap-2 border border-primary bg-primary/10 p-4 text-sm text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span>{savedMsg}</span>
              </div>
            )}
          </form>
        )}

        {/* TAB 3: CRM INBOX */}
        {tab === "inbox" && (
          <div className="space-y-4">
            {inquiries.length === 0 ? (
              <div className="border border-border bg-card p-12 text-center text-muted-foreground">
                Henüz gelen teklif veya ithalat talebi bulunmuyor.
              </div>
            ) : (
              inquiries.map((m) => {
                const cleanPhone = m.phone.replace(/[^0-9]/g, "");
                const waReplyUrl = `https://wa.me/${
                  cleanPhone.startsWith("90") ? cleanPhone : `90${cleanPhone.replace(/^0/, "")}`
                }?text=${encodeURIComponent(
                  `Merhaba ${m.name}, ByCar Global'e ilettiğiniz "${m.car}" (${m.type}) talebiniz için VIP danışmanınız olarak dönüş yapıyorum.`,
                )}`;

                return (
                  <div
                    key={m.id}
                    className="flex flex-col justify-between gap-4 border border-border bg-card p-5 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="bg-primary/20 px-2.5 py-0.5 font-semibold uppercase tracking-wider text-primary">
                          {m.type}
                        </span>
                        <span className="border border-border px-2 py-0.5 text-muted-foreground">
                          {m.status}
                        </span>
                        <span className="text-muted-foreground">· {m.time}</span>
                      </div>
                      <div className="font-display text-2xl font-semibold">
                        {m.car}
                      </div>
                      <div className="text-sm text-foreground">
                        <span className="font-semibold">{m.name}</span> ·{" "}
                        <a
                          href={`tel:${m.phone}`}
                          className="text-primary hover:underline"
                        >
                          {m.phone}
                        </a>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Teklif / Bütçe: <span className="text-foreground">{m.offerOrBudget}</span>
                      </div>
                      {m.details && (
                        <div className="text-xs text-muted-foreground">
                          Not: {m.details}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={m.status}
                        onChange={(e) =>
                          handleInquiryStatus(
                            m.id,
                            e.target.value as Inquiry["status"],
                          )
                        }
                        className="border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                      >
                        <option value="Yeni">Yeni</option>
                        <option value="İletişime Geçildi">İletişime Geçildi</option>
                        <option value="Tamamlandı">Tamamlandı</option>
                      </select>
                      <a
                        href={waReplyUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => handleInquiryStatus(m.id, "İletişime Geçildi")}
                        className={goldBtn}
                      >
                        <MessageCircle className="h-4 w-4" /> WhatsApp'tan Dönüş Yap
                      </a>
                      <button
                        onClick={() => handleDeleteInquiry(m.id)}
                        className="border border-border p-2.5 text-muted-foreground hover:border-destructive hover:text-destructive cursor-pointer"
                        title="Talebi Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
