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
  SlidersHorizontal,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  Film,
  Maximize2,
} from "lucide-react";
import {
  ADMIN_PRESETS,
  BRANDS,
  DEFAULT_SETTINGS,
  autoGenerateEnglishDescription,
  compressImageToWebP,
  getLoginLockoutState,
  recordLoginAttempt,
  translateTerm,
  useByCarStore,
  verifyAdminPasswordPBKDF2,
  type Car,
  type CarStatus,
  type ImageFit,
  type Inquiry,
  type Lang,
} from "@/lib/bycar";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "VIP Yönetim Paneli — ByCar Global" },
      { name: "description", content: "ByCar araç koleksiyonu, filtre ve VIP talep yönetim paneli." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const input =
  "w-full bg-background border border-input px-4 py-2.5 text-sm outline-none focus:border-primary placeholder:text-muted-foreground";
const goldBtn =
  "inline-flex items-center justify-center gap-2 bg-gold text-primary-foreground px-6 py-3 text-xs font-semibold tracking-wider uppercase shadow-gold hover:brightness-110 transition cursor-pointer disabled:opacity-50";

function ChipList({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = selected === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={`cursor-pointer border px-2.5 py-1 text-[11px] transition ${
              active
                ? "border-primary bg-primary font-semibold text-primary-foreground"
                : "border-border bg-background/70 text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

function Admin() {
  const {
    cars,
    inquiries,
    settings,
    lang,
    setLang,
    updateCars,
    resetCars,
    updateInquiries,
    updateSettings,
  } = useByCarStore();

  const [authed, setAuthed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("bycar_admin_auth") === "1";
  });
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [lockout, setLockout] = useState(() => getLoginLockoutState());

  const [tab, setTab] = useState<"fleet" | "add" | "inbox" | "settings">("fleet");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const maxAllowedYear = new Date().getFullYear() + 1;

  // Form states for Add / Edit Vehicle
  const [brand, setBrand] = useState("Porsche");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("2025");
  const [km, setKm] = useState("0");
  const [fuel, setFuel] = useState<Car["fuel"]>("Benzin");
  const [gear, setGear] = useState<Car["gear"]>("Otomatik");
  const [body, setBody] = useState<Car["body"]>("Coupe");
  const [status, setStatus] = useState<CarStatus>("active");
  const [featured, setFeatured] = useState(false);
  const [imageFit, setImageFit] = useState<ImageFit>("contain");
  const [video, setVideo] = useState("");
  const [power, setPower] = useState("510 HP (4.0 Atmosferik Boxer)");
  const [color, setColor] = useState("Jet Siyah / Bordo Deri");
  const [pkg, setPkg] = useState("Weissach Package");
  const [expertise, setExpertise] = useState("Hatasız / Boyasız / Orijinal");
  const [tramer, setTramer] = useState("Yok");
  const [descTr, setDescTr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([
    "Açılabilir Panoramik Cam Tavan",
    "Karbon Seramik Fren Sistemi",
    "360° Çevre Görüş Kamerası & Park Asistanı",
    "Isıtmalı & Soğutmalı Ön Koltuklar",
    "Kablosuz Apple CarPlay & Android Auto",
  ]);
  const [customExtraInput, setCustomExtraInput] = useState("");
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
    setFeatured(Boolean(c.featured));
    setImageFit(c.imageFit || "cover");
    setVideo(c.video || "");
    setPower(c.specs.power);
    setColor(c.specs.color);
    setPkg(c.specs.package);
    setExpertise(c.specs.expertise);
    setTramer(c.specs.tramer);
    setDescTr(c.description?.tr || "");
    setDescEn(c.description?.en || "");
    setSelectedExtras(c.extras || []);
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
    setFeatured(false);
    setImageFit("contain");
    setVideo("");
    setPower("510 HP (4.0 Atmosferik Boxer)");
    setColor("Jet Siyah / Bordo Deri");
    setPkg("Design Paket");
    setExpertise("Hatasız / Boyasız / Orijinal");
    setTramer("Yok");
    setDescTr("");
    setDescEn("");
    setSelectedExtras([
      "Açılabilir Panoramik Cam Tavan",
      "Geri Görüş Kamerası & Ön-Arka Park Sensörü",
      "Isıtmalı & Soğutmalı Ön Koltuklar",
      "Kablosuz Apple CarPlay & Android Auto",
    ]);
    setCustomExtraInput("");
    setImages([]);
    setImgUrlInput("");
  };

  const toggleExtraChip = (trText: string) => {
    setSelectedExtras((prev) =>
      prev.includes(trText) ? prev.filter((x) => x !== trText) : [...prev, trText],
    );
  };

  const addCustomExtra = () => {
    const trimmed = customExtraInput.trim();
    if (!trimmed) return;
    if (!selectedExtras.includes(trimmed)) {
      setSelectedExtras((prev) => [...prev, trimmed]);
    }
    setCustomExtraInput("");
  };

  const processFiles = async (fileList: File[]) => {
    if (fileList.length === 0) return;
    setUploading(true);
    try {
      const compressed: string[] = [];
      for (const file of fileList) {
        if (!file.type.startsWith("image/")) continue;
        const webpDataUrl = await compressImageToWebP(file, 1600, 0.82);
        compressed.push(webpDataUrl);
      }
      setImages((prev) => [...prev, ...compressed]);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    void processFiles(files);
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

  const moveImage = (idx: number, dir: -1 | 1) => {
    setImages((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStatusChange = (id: string, nextStatus: CarStatus) => {
    updateCars(
      cars.map((c) =>
        c.id === id ? { ...c, status: nextStatus, sold: nextStatus === "sold" } : c,
      ),
    );
  };

  const handleFitChange = (id: string, nextFit: ImageFit) => {
    updateCars(cars.map((c) => (c.id === id ? { ...c, imageFit: nextFit } : c)));
  };

  const handleToggleFeatured = (id: string) => {
    updateCars(
      cars.map((c) => (c.id === id ? { ...c, featured: !c.featured } : c)),
    );
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
    const isLocked = Boolean(lockout.lockedUntil && Date.now() < lockout.lockedUntil);
    const remainingMins = lockout.lockedUntil
      ? Math.max(1, Math.ceil((lockout.lockedUntil - Date.now()) / 60000))
      : 0;

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
              BYCAR GLOBAL · PBKDF2 KORUMALI
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold">
              VIP Yönetim Girişi
            </h1>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const currentLock = getLoginLockoutState();
              if (currentLock.lockedUntil && Date.now() < currentLock.lockedUntil) {
                setLockout(currentLock);
                return;
              }
              const ok = await verifyAdminPasswordPBKDF2(pw);
              const nextLock = recordLoginAttempt(ok);
              setLockout(nextLock);
              if (ok) {
                window.sessionStorage.setItem("bycar_admin_auth", "1");
                setAuthed(true);
                setPwErr("");
              } else {
                const rem = Math.max(0, 5 - nextLock.attempts);
                setPwErr(
                  rem > 0
                    ? `Hatalı yönetici şifresi. Kalan deneme hakkı: ${rem}`
                    : "5 hatalı deneme yapıldı. Hesap 15 dakika kilitlendi.",
                );
              }
            }}
            className="space-y-4"
          >
            <div>
              <input
                type="password"
                value={pw}
                disabled={isLocked}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Yönetici Şifresi"
                className={input}
                autoFocus
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Demo Giriş Şifresi:{" "}
                <code className="font-semibold text-primary">bycar2024</code>
              </p>
              {isLocked && (
                <p className="mt-2 border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                  Güvenlik kilidi aktif: Çok fazla hatalı deneme yapıldı. Lütfen{" "}
                  {remainingMins} dakika sonra tekrar deneyin.
                </p>
              )}
              {pwErr && !isLocked && (
                <p className="mt-1 text-xs text-destructive">{pwErr}</p>
              )}
            </div>
            <button type="submit" disabled={isLocked} className={`${goldBtn} w-full`}>
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
        {/* Top Bar with TR / EN Switcher */}
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
                Koleksiyon, Filtre & Talep Yönetimi
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Shared Site Language Toggle */}
            <div className="flex items-center gap-2 border border-border bg-card px-2.5 py-1.5 text-xs">
              <span className="text-muted-foreground">Vitrin Dili:</span>
              {(["tr", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`cursor-pointer px-2 py-0.5 uppercase transition ${
                    lang === l
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

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

        {/* 4 Navigation Tabs */}
        <div className="mb-8 grid grid-cols-2 border border-border bg-card lg:grid-cols-4">
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
          <button
            onClick={() => setTab("settings")}
            className={`cursor-pointer px-4 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
              tab === "settings"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            4. Filtre & Modal Ayarları
          </button>
        </div>

        {/* TAB 1: FLEET MANAGEMENT */}
        {tab === "fleet" && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Durumu, kadrajı (`Tam Sığdır / Doldur`) veya bilgileri değiştirilen araçlar anında ana vitrine yansır.
              </p>
              <div className="flex flex-wrap gap-2">
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
                  onClick={resetCars}
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
                const currentFit: ImageFit = c.imageFit || "cover";
                return (
                  <div
                    key={c.id}
                    className="flex flex-col justify-between gap-4 p-4 lg:flex-row lg:items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-28 shrink-0 overflow-hidden border border-border bg-black">
                        {currentFit === "contain" ? (
                          <>
                            <img
                              src={c.images[0]}
                              alt=""
                              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-md"
                            />
                            <img
                              src={c.images[0]}
                              alt={c.title}
                              className="relative z-10 h-full w-full object-contain"
                            />
                          </>
                        ) : (
                          <img
                            src={c.images[0]}
                            alt={c.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] uppercase tracking-widest text-primary">
                            {c.brand}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {c.year} · {c.km.toLocaleString("tr-TR")} KM ·{" "}
                            {c.images.length} Açı Fotoğraf
                            {c.video ? " + Video" : ""}
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
                      {/* Image Fit Toggle (Tam Sığdır vs Tam Doldur) */}
                      <button
                        type="button"
                        onClick={() =>
                          handleFitChange(
                            c.id,
                            currentFit === "contain" ? "cover" : "contain",
                          )
                        }
                        title="Kart Fotoğraf Kadrajı: Tam Sığdır (Kesmeden) / Tam Doldur"
                        className={`inline-flex cursor-pointer items-center gap-1 border px-2.5 py-1.5 text-[11px] transition ${
                          currentFit === "contain"
                            ? "border-primary/70 bg-primary/15 text-primary font-semibold"
                            : "border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        <Maximize2 className="h-3 w-3" />
                        {currentFit === "contain" ? "Tam Sığdır" : "Tam Doldur"}
                      </button>

                      {/* Featured Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(c.id)}
                        title="Vitrinde Öne Çıkar"
                        className={`inline-flex cursor-pointer items-center gap-1 border px-2.5 py-1.5 text-[11px] transition ${
                          c.featured
                            ? "border-primary bg-primary/20 text-primary font-semibold"
                            : "border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        <Star
                          className={`h-3 w-3 ${c.featured ? "fill-primary text-primary" : ""}`}
                        />
                        Öne Çıkar
                      </button>

                      {/* Status Buttons */}
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
                                  ? "border-destructive bg-destructive font-semibold text-destructive-foreground"
                                  : st === "draft"
                                    ? "border-muted-foreground bg-muted font-semibold text-foreground"
                                    : "border-primary bg-primary font-semibold text-primary-foreground"
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

        {/* TAB 2: ADD / EDIT VEHICLE WITH CLICKABLE CHIPS & DRAG-DROP WEBP */}
        {tab === "add" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const numYear = Math.min(
                maxAllowedYear,
                Math.max(1900, Number(year) || 2025),
              );
              const numKm = Math.max(0, Number(km) || 0);
              const finalTitle = title.trim() || `${brand} ${pkg || "Exclusive"}`;
              const finalImages =
                images.length > 0
                  ? images
                  : ["/cars/cupra/1.jpg", "/cars/cupra/2.jpg"];

              const finalDescTr =
                descTr.trim() ||
                `${numYear} model ${finalTitle}. ${power}, ${color}, ${expertise} kondisyonda ByCar Global özel koleksiyon aracı.`;
              const finalDescEn =
                descEn.trim() ||
                autoGenerateEnglishDescription(
                  finalTitle,
                  brand,
                  numYear,
                  numKm,
                  power,
                  pkg,
                  expertise,
                );

              const finalExtrasEn = selectedExtras.map((trItem) =>
                translateTerm(trItem, "en"),
              );

              const newCar: Car = {
                id: editingId || `car-${Date.now()}`,
                brand: brand.trim() || "Porsche",
                title: finalTitle,
                year: numYear,
                km: numKm,
                fuel,
                gear,
                body,
                status,
                sold: status === "sold",
                featured,
                imageFit,
                video: video.trim() || undefined,
                images: finalImages,
                specs: {
                  power: power || "Belirtilmedi",
                  color: color || "Özel Renk",
                  package: pkg || "Exclusive Paket",
                  expertise: expertise || "Hatasız / Boyasız / Orijinal",
                  tramer: tramer || "Yok",
                },
                extras: selectedExtras,
                extrasEn: finalExtrasEn,
                description: {
                  tr: finalDescTr,
                  en: finalDescEn,
                },
              };

              if (editingId) {
                updateCars(cars.map((c) => (c.id === editingId ? newCar : c)));
                setSavedMsg("Araç başarıyla güncellendi ve vitrine yansıtıldı.");
              } else {
                updateCars([newCar, ...cars]);
                setSavedMsg(
                  "Yeni araç başarıyla koleksiyona eklendi! (Markası filtre barına otomatik tanımlandı)",
                );
              }
              setTimeout(() => setSavedMsg(""), 4000);
              clearForm();
            }}
            className="grid gap-5 border border-border bg-card p-6 sm:grid-cols-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 sm:col-span-2">
              <div>
                <h2 className="font-display text-2xl font-semibold">
                  {editingId ? "Araç Bilgilerini Düzenle" : "Koleksiyona Yeni Araç Ekle"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Hazır etiketlere tıklayarak saniyeler içinde seçebilir veya kutulara serbestçe yazabilirsiniz.
                </p>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="cursor-pointer text-xs text-primary underline"
                >
                  Yeni Araç Formuna Geç
                </button>
              )}
            </div>

            {/* 1. MARKA (Clickable Chips + Free Input) */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primary">
                1. Marka Seçin (veya Yeni Marka Yazın — Filtrelerde Otomatik Oluşur)
              </label>
              <ChipList
                items={ADMIN_PRESETS.brands}
                selected={brand}
                onSelect={(b) => {
                  setBrand(b);
                  if (!title) setTitle(`${b} `);
                }}
              />
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Marka adı yazın (Örn: Porsche, Aston Martin, Range Rover...)"
                className={input}
              />
            </div>

            {/* 2. ARAÇ BAŞLIĞI & DONANIM PAKETİ */}
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Araç Başlığı (Marka & Model & Paket)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Örn: ${brand} 911 Turbo S Cabriolet`}
                className={input}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Boş bırakırsanız Marka + Paket adından otomatik oluşturulur.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Donanım Paketi (Tıklayın veya Yazın)
              </label>
              <ChipList
                items={ADMIN_PRESETS.packages.slice(0, 6)}
                selected={pkg}
                onSelect={setPkg}
              />
              <input
                value={pkg}
                onChange={(e) => setPkg(e.target.value)}
                placeholder="Örn: Weissach Package, S-Line, Design..."
                className={input}
              />
            </div>

            {/* 3. MODEL YILI & KİLOMETRE */}
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Model Yılı (1900 – {maxAllowedYear})
              </label>
              <ChipList
                items={["2026", "2025", "2024", "2023", "2022", "2020", "2016"]}
                selected={year}
                onSelect={setYear}
              />
              <input
                type="number"
                min={1900}
                max={maxAllowedYear}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={input}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Kilometre (KM)
              </label>
              <ChipList
                items={["0", "1200", "6001", "15000", "18500", "30000", "50000"]}
                selected={km}
                onSelect={setKm}
              />
              <input
                type="number"
                min={0}
                value={km}
                onChange={(e) => setKm(e.target.value)}
                className={input}
              />
            </div>

            {/* 4. YAKIT, VİTES, KASA TİPİ (1-Click Pills) */}
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                  Yakıt Türü
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["Benzin", "Hibrit", "Elektrik", "Dizel"] as Car["fuel"][]).map(
                    (f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFuel(f)}
                        className={`cursor-pointer border py-2 text-xs font-semibold transition ${
                          fuel === f
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {f}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                  Vites Tipi
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["Otomatik", "Manuel"] as Car["gear"][]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGear(g)}
                      className={`cursor-pointer border py-2 text-xs font-semibold transition ${
                        gear === g
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">
                  Kasa Tipi
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["Coupe", "SUV", "Sedan", "Cabrio"] as Car["body"][]).map(
                    (b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBody(b)}
                        className={`cursor-pointer border py-2 text-xs font-semibold transition ${
                          body === b
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {b}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* 5. MOTOR GÜCÜ & DIŞ / İÇ RENK */}
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Motor Gücü (Tıklayın veya Yazın)
              </label>
              <ChipList
                items={ADMIN_PRESETS.powers.slice(0, 5)}
                selected={power}
                onSelect={setPower}
              />
              <input
                value={power}
                onChange={(e) => setPower(e.target.value)}
                placeholder="Örn: 650 HP (3.8 Boxer Twin-Turbo)"
                className={input}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Dış / İç Renk (Tıklayın veya Yazın)
              </label>
              <ChipList
                items={ADMIN_PRESETS.colors.slice(0, 5)}
                selected={color}
                onSelect={setColor}
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Örn: Jet Siyah / Bordo Deri"
                className={input}
              />
            </div>

            {/* 6. EKSPERTİZ & TRAMER */}
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Ekspertiz Durumu (Tıklayın veya Yazın)
              </label>
              <ChipList
                items={ADMIN_PRESETS.expertises}
                selected={expertise}
                onSelect={setExpertise}
              />
              <input
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                className={input}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Tramer Kaydı & Yayın Durumu
              </label>
              <ChipList
                items={ADMIN_PRESETS.tramers}
                selected={tramer}
                onSelect={setTramer}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={tramer}
                  onChange={(e) => setTramer(e.target.value)}
                  placeholder="Tramer (Örn: Yok)"
                  className={input}
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CarStatus)}
                  className={input}
                >
                  <option value="active">Satışta (Aktif)</option>
                  <option value="sold">Satıldı (SATILDI)</option>
                  <option value="draft">Taslak (Gizli)</option>
                </select>
              </div>
            </div>

            {/* 7. KART FOTOĞRAF KADRAJI, ÖNE ÇIKAR & VİDEO URL */}
            <div className="grid gap-4 border border-border/80 bg-background/40 p-4 sm:col-span-2 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primary">
                  Kart Fotoğraf Sığdırma
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImageFit("contain")}
                    className={`cursor-pointer border px-2 py-2 text-xs font-semibold transition ${
                      imageFit === "contain"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    Tam Sığdır (Kesmeden)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFit("cover")}
                    className={`cursor-pointer border px-2 py-2 text-xs font-semibold transition ${
                      imageFit === "cover"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    Tam Doldur (Cover)
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primary">
                  Vitrinde Öne Çıkar
                </label>
                <button
                  type="button"
                  onClick={() => setFeatured((v) => !v)}
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 border py-2 text-xs font-semibold transition ${
                    featured
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary"
                  }`}
                >
                  <Star className={`h-4 w-4 ${featured ? "fill-current" : ""}`} />
                  {featured ? "Öne Çıkan Araç (Aktif)" : "Standart Görünüm"}
                </button>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Film className="h-3.5 w-3.5" /> Tanıtım Videosu (MP4 URL)
                </label>
                <input
                  value={video}
                  onChange={(e) => setVideo(e.target.value)}
                  placeholder="Opsiyonel: /cars/cupra/video.mp4"
                  className={input}
                />
              </div>
            </div>

            {/* 8. TIKLANABİLİR DONANIM & OPSİYON ETİKETLERİ (24+ Chips + Serbest Ekleme) */}
            <div className="border border-border bg-background/40 p-4 sm:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Donanım & Opsiyonlar — Tıklayarak Seçin ({selectedExtras.length} Seçili)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Seçilen donanımların İngilizce karşılıkları otomatik eşleştirilir.
                </span>
              </div>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {ADMIN_PRESETS.extras.map((item) => {
                  const isSel = selectedExtras.includes(item.tr);
                  return (
                    <button
                      key={item.tr}
                      type="button"
                      onClick={() => toggleExtraChip(item.tr)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 border px-3 py-1.5 text-xs transition ${
                        isSel
                          ? "border-primary bg-primary font-semibold text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"
                      }`}
                    >
                      {isSel && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                      <span>{item.tr}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Extra Input */}
              <div className="flex gap-2">
                <input
                  value={customExtraInput}
                  onChange={(e) => setCustomExtraInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomExtra();
                    }
                  }}
                  placeholder="Listede olmayan özel bir donanım yazıp 'Ekle'ye basın..."
                  className={input}
                />
                <button
                  type="button"
                  onClick={addCustomExtra}
                  className="cursor-pointer border border-primary px-4 text-xs font-semibold uppercase text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  + Ekle
                </button>
              </div>

              {selectedExtras.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
                  {selectedExtras.map((ext) => (
                    <span
                      key={ext}
                      className="inline-flex items-center gap-1.5 border border-primary/50 bg-primary/10 px-2.5 py-1 text-[11px] text-primary"
                    >
                      {ext}
                      <button
                        type="button"
                        onClick={() => toggleExtraChip(ext)}
                        className="cursor-pointer text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 9. AÇIKLAMA (TR + Otomatik İngilizce Oluşturucu) */}
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                  Araç Açıklaması (Türkçe — Boş Bırakılırsa Otomatik Oluşur)
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
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    İngilizce Açıklama (Otomatik Üretilir)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDescEn(
                        autoGenerateEnglishDescription(
                          title || `${brand} ${pkg}`,
                          brand,
                          Number(year) || 2025,
                          Number(km) || 0,
                          power,
                          pkg,
                          expertise,
                        ),
                      )
                    }
                    className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Sparkles className="h-3 w-3" /> Otomatik İngilizce Oluştur
                  </button>
                </div>
                <textarea
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  rows={3}
                  placeholder="Boş bırakabilirsiniz; kaydederken Türkçe bilgilerinizden otomatik İngilizceye çevrilir."
                  className={input}
                />
              </div>
            </div>

            {/* 10. DRAG & DROP WEBP PHOTO UPLOADER + COVER & ORDERING */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const files = Array.from(e.dataTransfer.files || []);
                void processFiles(files);
              }}
              className={`border-2 border-dashed p-5 transition sm:col-span-2 ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background/50"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  <ImageIcon className="h-4 w-4" /> Çok Açılı Fotoğraf Galerisi (Sürükle-Bırak + Otomatik WebP Sıkıştırma)
                </label>
                {uploading && (
                  <span className="text-xs text-primary">
                    Fotoğraflar WebP formatında optimize ediliyor...
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center justify-center gap-2 border border-primary/50 bg-card px-4 py-3 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground">
                  <UploadCloud className="h-4 w-4" />
                  <span>Fotoğrafları Seçin veya Buraya Sürükleyin</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

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
                    className="cursor-pointer border border-primary px-4 text-xs font-semibold uppercase text-primary hover:bg-primary hover:text-primary-foreground"
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
                      className={`relative w-36 border-2 bg-card p-1.5 ${
                        idx === 0 ? "border-primary" : "border-border"
                      }`}
                    >
                      <img
                        src={src}
                        alt=""
                        className="aspect-video w-full object-contain bg-black"
                      />
                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        {idx === 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-primary">
                            <Star className="h-3 w-3 fill-primary" /> KAPAK
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAsCover(idx)}
                            className="cursor-pointer text-muted-foreground hover:text-primary"
                          >
                            Kapak Yap
                          </button>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveImage(idx, -1)}
                            className="cursor-pointer p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30"
                            title="Sola Taşı"
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === images.length - 1}
                            onClick={() => moveImage(idx, 1)}
                            className="cursor-pointer p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30"
                            title="Sağa Taşı"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="cursor-pointer text-destructive"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className={`${goldBtn} py-4 sm:col-span-2`}>
              {editingId ? "Değişiklikleri Kaydet & Yayınla" : "Aracı Koleksiyona Kaydet"}
            </button>

            {savedMsg && (
              <div className="flex items-center gap-2 border border-primary bg-primary/10 p-4 text-sm text-primary sm:col-span-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>{savedMsg}</span>
              </div>
            )}
          </form>
        )}

        {/* TAB 3: CRM INBOX */}
        {tab === "inbox" && (
          <div className="space-y-4">
            <div className="border border-primary/40 bg-card p-4 text-xs text-muted-foreground">
              <strong className="text-primary">Çift Kanal Talep Sistemi Aktif:</strong>{" "}
              Müşteriler sitedeki "Site Üzerinden Teklif Ver" veya "Özel İthalat Talebi" formunu gönderdiğinde talep hem bu listeye düşer hem de otomatik olarak WhatsApp (`+90 540 061 16 34`) mesaj ekranını hazırlar.
            </div>
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
                        className="cursor-pointer border border-border p-2.5 text-muted-foreground hover:border-destructive hover:text-destructive"
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

        {/* TAB 4: SHOWCASE, FILTER & 3-TAB MODAL SETTINGS */}
        {tab === "settings" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Filter Controls */}
            <div className="border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-semibold">
                  Gelişmiş Filtreleme Ayarları
                </h2>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Vitrindeki koleksiyon bölümünde hangi filtrelerin müşterilere gösterileceğini buradan tek tıkla açıp kapatabilirsiniz.
              </p>

              <div className="space-y-3 text-sm">
                {(
                  [
                    ["showSearchFilter", "Arama Kutusu (Marka / Model Arama)"],
                    ["showYearFilter", "Model Yılı Filtresi"],
                    ["showBodyFilter", "Kasa Tipi (Coupe, SUV, Sedan, Cabrio) Filtresi"],
                    ["showFuelFilter", "Yakıt Türü Filtresi"],
                    ["showGearFilter", "Vites Tipi Filtresi"],
                    ["showStatusFilter", "Durum (Tümü / Satışta / Satılanlar) Filtresi"],
                    ["filterPanelDefaultOpen", "Gelişmiş Filtre Paneli Sayfa Açılışında Açık Gelsin"],
                  ] as [keyof typeof settings, string][]
                ).map(([key, label]) => {
                  const val = Boolean(settings[key]);
                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center justify-between border border-border bg-background/50 px-4 py-3"
                    >
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) =>
                          updateSettings({ ...settings, [key]: e.target.checked })
                        }
                        className="h-4 w-4 accent-amber-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3-Tab Detail Modal & Card / WhatsApp Settings */}
            <div className="space-y-6">
              <div className="border border-border bg-card p-6">
                <h2 className="mb-3 border-b border-border pb-3 font-display text-2xl font-semibold">
                  3 Sekmeli Araç Detay Modalı Ayarları
                </h2>
                <div className="space-y-3 text-sm">
                  {(
                    [
                      ["modalShowSpecsTab", "1. Sekme: Teknik & Ekspertiz Tablosu"],
                      ["modalShowExtrasTab", "2. Sekme: Donanım & Opsiyonlar Listesi"],
                      ["modalShowOfferTab", "3. Sekme: Site Üzerinden Teklif Ver Formu"],
                    ] as [keyof typeof settings, string][]
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center justify-between border border-border bg-background/50 px-4 py-3"
                    >
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(settings[key])}
                        onChange={(e) =>
                          updateSettings({ ...settings, [key]: e.target.checked })
                        }
                        className="h-4 w-4 accent-amber-500"
                      />
                    </label>
                  ))}

                  <div className="pt-2">
                    <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                      Modal Açıldığında İlk Görünecek Sekme
                    </label>
                    <select
                      value={settings.modalDefaultTab}
                      onChange={(e) =>
                        updateSettings({
                          ...settings,
                          modalDefaultTab: e.target.value as
                            | "specs"
                            | "extras"
                            | "offer",
                        })
                      }
                      className={input}
                    >
                      <option value="specs">Teknik & Ekspertiz</option>
                      <option value="extras">Donanım & Opsiyonlar</option>
                      <option value="offer">Site Üzerinden Teklif Ver</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border border-border bg-card p-6">
                <h2 className="mb-3 border-b border-border pb-3 font-display text-2xl font-semibold">
                  Kart Fotoğraf Kadrajı & WhatsApp Akışı
                </h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                      Varsayılan Araç Kartı Fotoğraf Görünümü
                    </label>
                    <select
                      value={settings.defaultCardFit}
                      onChange={(e) =>
                        updateSettings({
                          ...settings,
                          defaultCardFit: e.target.value as ImageFit,
                        })
                      }
                      className={input}
                    >
                      <option value="contain">
                        Tam Sığdır (Kesmeden + Bulanık Lüks Arka Plan)
                      </option>
                      <option value="cover">Tam Doldur (Sinematik Cover)</option>
                    </select>
                  </div>

                  <label className="flex cursor-pointer items-center justify-between border border-border bg-background/50 px-4 py-3">
                    <span>
                      "Talebi VIP Danışmana İlet" Gönderildiğinde Otomatik WhatsApp Aç
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.whatsappAutoOpenOnForm}
                      onChange={(e) =>
                        updateSettings({
                          ...settings,
                          whatsappAutoOpenOnForm: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-amber-500"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => updateSettings(DEFAULT_SETTINGS)}
                    className="inline-flex cursor-pointer items-center gap-1.5 border border-border px-4 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Ayarları Varsayılana Döndür
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
