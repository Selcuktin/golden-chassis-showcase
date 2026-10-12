import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  ArrowUp,
  ArrowDown,
  UploadCloud,
  Film,
  Maximize2,
  GripVertical,
  Eye,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Upload,
  Undo2,
} from "lucide-react";
import {
  ADMIN_PRESETS,
  DEFAULT_SETTINGS,
  autoGenerateEnglishDescription,
  compressImageToWebP,
  exportD1SqlDump,
  exportDatabaseJSON,
  getLoginLockoutState,
  importDatabaseJSON,
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
    undoSnap,
    setLang,
    updateCars,
    resetCars,
    updateInquiries,
    resetInquiries,
    updateSettings,
    restoreUndo,
  } = useByCarStore();

  // SSR-safe hydration: initialize false and sync in useEffect
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [lockout, setLockout] = useState<{ attempts: number; lockedUntil: number | null }>({
    attempts: 0,
    lockedUntil: null,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthed(window.sessionStorage.getItem("bycar_admin_auth") === "1");
      setLockout(getLoginLockoutState());
    }
  }, []);

  const [tab, setTab] = useState<"fleet" | "add" | "inbox" | "settings">("fleet");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState("");
  const [dbMsg, setDbMsg] = useState("");
  const [fleetSearch, setFleetSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number>(0);

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

  const flashNotice = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(""), 4500);
  };

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
    setImageFit(c.imageFit || settings.defaultCardFit || "cover");
    setVideo(c.video || "");
    setPower(c.specs.power);
    setColor(c.specs.color);
    setPkg(c.specs.package);
    setExpertise(c.specs.expertise);
    setTramer(c.specs.tramer);
    setDescTr(c.description?.tr || "");
    setDescEn(c.description?.en || "");
    setSelectedExtras(c.extras || []);
    setImages(Array.from(new Set(c.images)));
    setPreviewIdx(0);
    setDragIdx(null);
    setDragOverIdx(null);
    setTab("add");
  };

  const resetCurrentEdit = () => {
    if (editingId) {
      const orig = cars.find((c) => c.id === editingId);
      if (orig) {
        startEdit(orig);
        flashNotice("Düzenleme sıfırlandı: Aracın kayıtlı orijinal bilgileri ve fotoğrafları geri yüklendi.");
        return;
      }
    }
    clearForm();
    flashNotice("Form varsayılan değerlere sıfırlandı.");
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
    setImageFit(settings.defaultCardFit || "contain");
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
    setPreviewIdx(0);
    setDragIdx(null);
    setDragOverIdx(null);
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
      setImages((prev) => {
        const next = [...prev];
        for (const item of compressed) {
          if (!next.includes(item)) next.push(item);
        }
        return next;
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    void processFiles(files);
    e.target.value = "";
  };

  const addImageUrl = () => {
    const trimmed = imgUrlInput.trim();
    if (!trimmed) return;
    setImages((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setImgUrlInput("");
  };

  const setAsCover = (idx: number) => {
    setImages((prev) => {
      const chosen = prev[idx];
      if (!chosen) return prev;
      return [chosen, ...prev.filter((_, i) => i !== idx)];
    });
    setPreviewIdx(0);
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
    setPreviewIdx((prevIdx) => {
      const target = idx + dir;
      if (prevIdx === idx && target >= 0 && target < images.length) return target;
      return prevIdx;
    });
  };

  const reorderImages = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    setImages((prev) => {
      if (fromIdx >= prev.length || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setPreviewIdx(toIdx);
  };

  const deduplicateImages = () => {
    setImages((prev) => Array.from(new Set(prev)));
    setPreviewIdx(0);
  };

  const previewImages = (() => {
    if (
      dragIdx === null ||
      dragOverIdx === null ||
      dragIdx === dragOverIdx ||
      dragIdx < 0 ||
      dragOverIdx < 0 ||
      dragIdx >= images.length ||
      dragOverIdx >= images.length
    ) {
      return images;
    }
    const next = [...images];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(dragOverIdx, 0, moved);
    return next;
  })();

  const activePreviewIndex =
    dragOverIdx !== null && dragOverIdx < previewImages.length
      ? dragOverIdx
      : Math.min(previewIdx, Math.max(0, previewImages.length - 1));

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviewIdx((prev) => Math.max(0, Math.min(prev, images.length - 2)));
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

  const moveCarInFleet = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= cars.length) return;
    const next = [...cars];
    const temp = next[idx];
    next[idx] = next[target];
    next[target] = temp;
    updateCars(next);
  };

  const handleDeleteCar = (id: string) => {
    const target = cars.find((c) => c.id === id);
    updateCars(
      cars.filter((c) => c.id !== id),
      target ? `"${target.title}" Silindi` : "Araç Silindi",
    );
    if (editingId === id) clearForm();
  };

  const handleInquiryStatus = (id: string, nextStatus: Inquiry["status"]) => {
    updateInquiries(
      inquiries.map((m) => (m.id === id ? { ...m, status: nextStatus } : m)),
    );
  };

  const handleDeleteInquiry = (id: string) => {
    const target = inquiries.find((m) => m.id === id);
    updateInquiries(
      inquiries.filter((m) => m.id !== id),
      target ? `"${target.name}" Talebi Silindi` : "Talep Silindi",
    );
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    if (typeof window === "undefined") return;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importDatabaseJSON(String(reader.result || ""));
      setDbMsg(res.message);
      setTimeout(() => setDbMsg(""), 5000);
    };
    reader.readAsText(file);
    e.target.value = "";
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
                id="admin-password"
                name="admin_password"
                type="password"
                autoComplete="current-password"
                value={pw}
                disabled={isLocked}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Yönetici Şifresi"
                className={input}
                autoFocus
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Demo Giriş Şifresi:{" "}
                <code className="font-semibold text-primary">bycar2024</code> veya{" "}
                <code className="font-semibold text-primary">bycar2026</code>
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

        {/* Undo / Database Recovery Banner */}
        {(undoSnap || dbMsg) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-primary/50 bg-primary/10 px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              {dbMsg ? (
                <span className="font-semibold text-primary">{dbMsg}</span>
              ) : (
                <span>
                  Son işlem yedeklendi:{" "}
                  <strong className="text-primary">
                    {undoSnap?.label} ({undoSnap?.timestamp})
                  </strong>
                </span>
              )}
            </div>
            {undoSnap && (
              <button
                type="button"
                onClick={() => {
                  const snap = restoreUndo();
                  if (snap) {
                    setDbMsg(`"${snap.label}" işlemi geri alındı, önceki veriler yüklendi.`);
                    setTimeout(() => setDbMsg(""), 4500);
                  }
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 border border-primary bg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow"
              >
                <Undo2 className="h-3.5 w-3.5" /> Son İşlemi Geri Al (Veriyi Kurtar)
              </button>
            )}
          </div>
        )}

        {/* 4 Navigation Tabs */}
        <div className="mb-8 grid grid-cols-2 border border-border bg-card lg:grid-cols-4">
          <button
            type="button"
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
            type="button"
            onClick={() => setTab("add")}
            className={`cursor-pointer px-4 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
              tab === "add"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            2. {editingId ? "Aracı Düzenle" : "Yeni Araç Ekle"}
          </button>
          <button
            type="button"
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
            type="button"
            onClick={() => setTab("settings")}
            className={`cursor-pointer px-4 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
              tab === "settings"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            4. Filtre, Modal & Veritabanı
          </button>
        </div>

        {/* TAB 1: FLEET MANAGEMENT */}
        {tab === "fleet" && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <input
                  value={fleetSearch}
                  onChange={(e) => setFleetSearch(e.target.value)}
                  placeholder="Koleksiyonda ara (Marka, model, kasa, paket...)"
                  className={`${input} max-w-xs`}
                />
                <span className="text-xs text-muted-foreground">
                  Durumu, sırası (`↑`/`↓`) veya kadrajı değiştirilen araçlar anında vitrine yansır.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearForm();
                    setTab("add");
                  }}
                  className={goldBtn}
                >
                  <Plus className="h-4 w-4" /> Yeni Araç Ekle
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadFile(
                      exportD1SqlDump(),
                      "bycar-d1-veritabani.sql",
                      "application/sql",
                    )
                  }
                  className="inline-flex cursor-pointer items-center gap-1.5 border border-primary/50 bg-card px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                  title="Tüm araçları ve talepleri Cloudflare D1 SQLite formatında indir"
                >
                  <Database className="h-3.5 w-3.5" /> D1 SQL İndir
                </button>
                <button
                  type="button"
                  onClick={resetCars}
                  className="inline-flex cursor-pointer items-center gap-1.5 border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Varsayılan 10 Aracı Yükle
                </button>
              </div>
            </div>

            <div className="divide-y divide-border border border-border bg-card">
              {cars
                .map((c, originalIdx) => ({ c, originalIdx }))
                .filter(({ c }) => {
                  if (!fleetSearch.trim()) return true;
                  const q = fleetSearch.toLowerCase();
                  return (
                    c.title.toLowerCase().includes(q) ||
                    c.brand.toLowerCase().includes(q) ||
                    c.body.toLowerCase().includes(q) ||
                    c.specs.package.toLowerCase().includes(q)
                  );
                })
                .map(({ c, originalIdx }) => {
                  const currentStatus: CarStatus =
                    c.status || (c.sold ? "sold" : "active");
                  const currentFit: ImageFit = c.imageFit || "cover";
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col justify-between gap-4 p-4 lg:flex-row lg:items-center"
                    >
                      <div className="flex items-center gap-4">
                        {/* Order Controls (Up / Down) */}
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            disabled={originalIdx === 0}
                            onClick={() => moveCarInFleet(originalIdx, -1)}
                            className="cursor-pointer border border-border p-1 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-30"
                            title="Sırayı Yukarı Taşı"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <span className="text-[10px] font-bold text-primary">
                            #{originalIdx + 1}
                          </span>
                          <button
                            type="button"
                            disabled={originalIdx === cars.length - 1}
                            onClick={() => moveCarInFleet(originalIdx, 1)}
                            className="cursor-pointer border border-border p-1 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-30"
                            title="Sırayı Aşağı Taşı"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>

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
                            <span className="border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                              {c.body}
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
                              type="button"
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
                          type="button"
                          onClick={() => startEdit(c)}
                          className="inline-flex cursor-pointer items-center gap-1 border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary hover:text-primary"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCar(c.id)}
                          className="inline-flex cursor-pointer items-center gap-1 border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                          title="Aracı Sil (Geri Alınabilir)"
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

        {/* TAB 2: ADD / EDIT VEHICLE WITH CLICKABLE CHIPS & UNRESTRICTED INPUTS */}
        {tab === "add" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsedYear = Number(String(year).replace(/[^0-9]/g, ""));
              const numYear = parsedYear > 0 ? parsedYear : new Date().getFullYear();
              const parsedKm = Number(String(km).replace(/[^0-9]/g, ""));
              const numKm = parsedKm >= 0 ? parsedKm : 0;
              const cleanBrand = brand.trim() || "Porsche";
              const finalTitle =
                title.trim() || `${cleanBrand} ${pkg.trim() || "Exclusive"}`;
              const finalImages =
                images.length > 0
                  ? Array.from(new Set(images))
                  : ["/cars/cupra/1.jpg", "/cars/cupra/2.jpg"];

              const finalDescTr =
                descTr.trim() ||
                `${numYear} model ${finalTitle}. ${power || "Yüksek performans"}, ${
                  color || "Özel renk"
                }, ${expertise || "Hatasız / Boyasız"} kondisyonda ByCar Global özel koleksiyon aracı.`;
              const finalDescEn =
                descEn.trim() ||
                autoGenerateEnglishDescription(
                  finalTitle,
                  cleanBrand,
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
                brand: cleanBrand,
                title: finalTitle,
                year: numYear,
                km: numKm,
                fuel: fuel.trim() || "Benzin",
                gear: gear.trim() || "Otomatik",
                body: body.trim() || "Coupe",
                status,
                sold: status === "sold",
                featured,
                imageFit,
                video: video.trim() || undefined,
                images: finalImages,
                specs: {
                  power: power.trim() || "Belirtilmedi",
                  color: color.trim() || "Özel Renk",
                  package: pkg.trim() || "Exclusive Paket",
                  expertise: expertise.trim() || "Hatasız / Boyasız / Orijinal",
                  tramer: tramer.trim() || "Yok",
                },
                extras: selectedExtras,
                extrasEn: finalExtrasEn,
                description: {
                  tr: finalDescTr,
                  en: finalDescEn,
                },
              };

              if (editingId) {
                updateCars(
                  cars.map((c) => (c.id === editingId ? newCar : c)),
                  `"${newCar.title}" Güncelleme Öncesi`,
                );
                flashNotice(
                  "Araç değişiklikleri başarıyla kaydedildi ve canlı vitrine yansıtıldı!",
                );
              } else {
                updateCars([newCar, ...cars], `"${newCar.title}" Ekleme Öncesi`);
                clearForm();
                flashNotice(
                  "Yeni araç başarıyla koleksiyona eklendi! (Marka, kasa, yakıt ve vites filtrelerine otomatik tanımlandı)",
                );
              }
            }}
            className="grid gap-5 border border-border bg-card p-6 sm:grid-cols-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 sm:col-span-2">
              <div>
                <h2 className="font-display text-2xl font-semibold">
                  {editingId ? "Araç Bilgilerini Düzenle" : "Koleksiyona Yeni Araç Ekle"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Hazır etiketlere tıklayarak hızlıca seçebilir veya tüm kutulara sınırlama olmadan serbestçe yazabilirsiniz.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={resetCurrentEdit}
                  className="inline-flex cursor-pointer items-center gap-1.5 border border-primary/60 bg-primary/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground"
                  title={
                    editingId
                      ? "Yaptığınız değişiklikleri geri alır ve aracın kayıtlı verilerini yükler"
                      : "Formdaki tüm alanları temizler ve sıfırlar"
                  }
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {editingId ? "Düzenlemeyi Sıfırla" : "Formu Sıfırla"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="inline-flex cursor-pointer items-center gap-1.5 border border-border bg-background px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-foreground transition hover:border-primary hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" /> Yeni Araç Formuna Geç
                  </button>
                )}
              </div>
            </div>

            {/* 1. MARKA (Clickable Chips + Free Input) */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primary">
                1. Marka Seçin veya İstediğiniz Markayı Yazın (Sınırlama Yok — Filtrede Otomatik Oluşur)
              </label>
              <ChipList
                items={ADMIN_PRESETS.brands}
                selected={brand}
                onSelect={(b) => {
                  const prevBrand = brand.trim();
                  setBrand(b);
                  if (
                    !title.trim() ||
                    title.trim() === prevBrand ||
                    ADMIN_PRESETS.brands.some((preset) => title.trim() === preset)
                  ) {
                    setTitle(`${b} `);
                  }
                }}
              />
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Marka adı yazın (Örn: Porsche, Aston Martin, Range Rover, Togg, Bugatti...)"
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
                Donanım Paketi (Tıklayın veya Serbestçe Yazın)
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

            {/* 3. MODEL YILI & KİLOMETRE (Unrestricted) */}
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Model Yılı (Tıklayın veya Serbestçe Yazın)
              </label>
              <ChipList
                items={["2026", "2025", "2024", "2023", "2022", "2020", "2016"]}
                selected={year}
                onSelect={setYear}
              />
              <input
                type="text"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Örn: 2025"
                className={input}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Kilometre (KM — Tıklayın veya Serbestçe Yazın)
              </label>
              <ChipList
                items={["0", "1200", "6001", "15000", "18500", "30000", "50000"]}
                selected={km}
                onSelect={setKm}
              />
              <input
                type="text"
                inputMode="numeric"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder="Örn: 0 veya 18500"
                className={input}
              />
            </div>

            {/* 4. YAKIT TÜRÜ, VİTES TİPİ, KASA TİPİ (Hem Tıklanabilir Hem Yazılabilir — Sınırlama Yok!) */}
            <div className="grid gap-4 border border-border/80 bg-background/40 p-4 sm:col-span-2 lg:grid-cols-3">
              {/* Yakıt Türü */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primary">
                  Yakıt Türü (Seçin veya Yazın)
                </label>
                <ChipList
                  items={ADMIN_PRESETS.fuels}
                  selected={fuel}
                  onSelect={setFuel}
                />
                <input
                  value={fuel}
                  onChange={(e) => setFuel(e.target.value)}
                  placeholder="Serbest yakıt türü yazın (Sınırlama yok)..."
                  className={input}
                />
              </div>

              {/* Vites Tipi */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primary">
                  Vites Tipi (Seçin veya Yazın)
                </label>
                <ChipList
                  items={ADMIN_PRESETS.gears}
                  selected={gear}
                  onSelect={setGear}
                />
                <input
                  value={gear}
                  onChange={(e) => setGear(e.target.value)}
                  placeholder="Serbest vites tipi yazın (Sınırlama yok)..."
                  className={input}
                />
              </div>

              {/* Kasa Tipi */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-primary">
                  Kasa Tipi (Seçin veya İstediğinizi Yazın)
                </label>
                <ChipList
                  items={ADMIN_PRESETS.bodies}
                  selected={body}
                  onSelect={setBody}
                />
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Örn: Hatchback, Station Wagon, VIP Minivan..."
                  className={input}
                />
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

            {/* 10. DRAG & DROP WEBP PHOTO UPLOADER + LIVE PREVIEW + DRAG-TO-REORDER */}
            <div className="space-y-4 border border-border bg-background/50 p-5 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  <ImageIcon className="h-4 w-4" /> Çok Açılı Fotoğraf Galerisi (Sürükle-Sırala + Canlı Vitrin Önizlemesi)
                </label>
                <div className="flex items-center gap-3">
                  {new Set(images).size !== images.length && (
                    <button
                      type="button"
                      onClick={deduplicateImages}
                      className="cursor-pointer border border-primary bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Tekrarlanan Kopyaları Temizle
                    </button>
                  )}
                  {uploading && (
                    <span className="text-xs text-primary">
                      Fotoğraflar WebP formatında optimize ediliyor...
                    </span>
                  )}
                </div>
              </div>

              {/* A. ISOLATED FILE UPLOAD DROPZONE (Ignores internal thumbnail drags) */}
              <div
                onDragOver={(e) => {
                  if (dragIdx !== null || e.dataTransfer.types.includes("text/x-bycar-thumb")) {
                    return;
                  }
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  setIsDragging(false);
                  if (dragIdx !== null || e.dataTransfer.types.includes("text/x-bycar-thumb")) {
                    return;
                  }
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files || []);
                  void processFiles(files);
                }}
                className={`grid gap-3 border-2 border-dashed p-4 transition sm:grid-cols-2 ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border/80 bg-card/60"
                }`}
              >
                <label className="flex cursor-pointer items-center justify-center gap-2 border border-primary/50 bg-card px-4 py-3 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground">
                  <UploadCloud className="h-4 w-4" />
                  <span>Bilgisayardan Fotoğraf Seçin veya Buraya Bırakın</span>
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addImageUrl();
                      }
                    }}
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

              {/* B. LIVE SHOWCASE & GALLERY PREVIEW PANEL */}
              {previewImages.length > 0 && (
                <div className="grid gap-4 border border-primary/30 bg-card/90 p-4 lg:grid-cols-12">
                  {/* Left: Large Interactive Gallery Angle Preview */}
                  <div className="space-y-2 lg:col-span-7">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                        <Eye className="h-3.5 w-3.5" />
                        Canlı Galeri Önizlemesi — Açı #{activePreviewIndex + 1} / {previewImages.length}
                        {activePreviewIndex === 0 && " (★ KAPAK GÖRSELİ)"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {dragIdx !== null
                          ? "Sürükleniyor: Yeni sıra canlı önizleniyor..."
                          : "Fotoğrafları sürükleyerek sırasını değiştirebilirsiniz"}
                      </span>
                    </div>

                    <div className="group relative aspect-video w-full overflow-hidden border border-border bg-black">
                      {imageFit === "contain" && (
                        <img
                          src={previewImages[activePreviewIndex]}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl"
                        />
                      )}
                      <img
                        src={previewImages[activePreviewIndex]}
                        alt="Canlı Önizleme"
                        draggable={false}
                        className={`relative z-10 h-full w-full select-none transition-all duration-300 ${
                          imageFit === "contain" ? "object-contain p-1.5" : "object-cover"
                        }`}
                      />

                      <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5">
                        {activePreviewIndex === 0 ? (
                          <span className="inline-flex items-center gap-1 bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow">
                            <Star className="h-3 w-3 fill-primary-foreground" /> #1 ANA VITRIN KAPAĞI
                          </span>
                        ) : (
                          <span className="border border-primary/50 bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary backdrop-blur-md">
                            GALERİ AÇISI #{activePreviewIndex + 1}
                          </span>
                        )}
                      </div>

                      {previewImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewIdx(
                                (activePreviewIndex - 1 + previewImages.length) %
                                  previewImages.length,
                              )
                            }
                            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 cursor-pointer border border-border bg-background/80 p-1.5 text-foreground backdrop-blur-sm transition hover:border-primary hover:text-primary"
                            title="Önceki Açı"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewIdx((activePreviewIndex + 1) % previewImages.length)
                            }
                            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 cursor-pointer border border-border bg-background/80 p-1.5 text-foreground backdrop-blur-sm transition hover:border-primary hover:text-primary"
                            title="Sonraki Açı"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Live Homepage Vitrin Card Replica */}
                  <div className=" flex flex-col justify-between space-y-2 lg:col-span-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        Ana Sayfa Vitrin Kartı Önizlemesi (#1 Kapak)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setImageFit((prev) => (prev === "contain" ? "cover" : "contain"))
                        }
                        className="cursor-pointer border border-primary/50 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        Kadraj: {imageFit === "contain" ? "Tam Sığdır" : "Tam Doldur"}
                      </button>
                    </div>

                    <div className="overflow-hidden border border-border bg-background shadow-lg">
                      <div className="relative aspect-video overflow-hidden bg-black">
                        {imageFit === "contain" && (
                          <img
                            src={previewImages[0]}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl"
                          />
                        )}
                        <img
                          src={previewImages[0]}
                          alt="Vitrin Kapak Önizlemesi"
                          draggable={false}
                          className={`relative z-10 h-full w-full select-none ${
                            imageFit === "contain" ? "object-contain p-1" : "object-cover"
                          }`}
                        />
                        <div className="absolute left-2.5 top-2.5 z-20 flex flex-wrap gap-1">
                          <span className="border border-primary/40 bg-background/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                            {year || "2025"} • {brand}
                          </span>
                          <span className="border border-border bg-background/90 px-2 py-0.5 text-[9px] font-semibold uppercase text-foreground">
                            {body}
                          </span>
                        </div>
                        <div className="absolute bottom-2 right-2 z-20 border border-border bg-background/85 px-2 py-0.5 text-[9px] font-semibold text-primary">
                          1/{previewImages.length} Fotoğraf
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="truncate font-serif text-sm font-bold text-foreground">
                          {title || `${brand} Koleksiyon Aracı`}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {power} • {color}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-1 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
                          <span>{km || "0"} KM</span>
                          <span>{fuel}</span>
                          <span>{gear}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* C. DRAG-TO-REORDER THUMBNAIL GRID */}
              {images.length > 0 && (
                <div
                  onDragOver={(e) => {
                    if (dragIdx !== null) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    if (dragIdx !== null && dragOverIdx !== null) {
                      e.preventDefault();
                      e.stopPropagation();
                      reorderImages(dragIdx, dragOverIdx);
                      setDragIdx(null);
                      setDragOverIdx(null);
                    }
                  }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Sıralamak için fotoğrafları basılı tutup sürükleyin (1. sıradaki fotoğraf vitrin kapağı olur):
                    </span>
                    <span className="font-semibold text-primary">
                      Toplam {images.length} Açı
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {images.map((_, idx) => {
                      const src = previewImages[idx] ?? images[idx];
                      const isTargetSlot = dragOverIdx === idx && dragIdx !== null;
                      const isSelectedPreview = activePreviewIndex === idx;
                      return (
                        <div
                          key={idx}
                          draggable
                          onClick={() => setPreviewIdx(idx)}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/x-bycar-thumb", String(idx));
                            setDragIdx(idx);
                            setDragOverIdx(idx);
                            setPreviewIdx(idx);
                          }}
                          onDragOver={(e) => {
                            if (dragIdx === null) return;
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverIdx !== idx) {
                              setDragOverIdx(idx);
                            }
                          }}
                          onDrop={(e) => {
                            if (dragIdx === null) return;
                            e.preventDefault();
                            e.stopPropagation();
                            reorderImages(dragIdx, idx);
                            setDragIdx(null);
                            setDragOverIdx(null);
                          }}
                          onDragEnd={() => {
                            if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
                              reorderImages(dragIdx, dragOverIdx);
                            }
                            setDragIdx(null);
                            setDragOverIdx(null);
                          }}
                          className={`group relative cursor-grab select-none border-2 bg-card p-1.5 transition active:cursor-grabbing ${
                            isTargetSlot
                              ? "scale-[1.03] border-primary ring-2 ring-primary/50"
                              : idx === 0
                                ? "border-primary"
                                : isSelectedPreview
                                  ? "border-primary/70"
                                  : "border-border hover:border-primary/40"
                          }`}
                        >
                          {/* Top Order Badge + Drag Handle */}
                          <div className="mb-1 flex items-center justify-between text-[10px]">
                            <span
                              className={`inline-flex items-center gap-1 font-bold uppercase ${
                                idx === 0 ? "text-primary" : "text-muted-foreground"
                              }`}
                            >
                              <GripVertical className="h-3.5 w-3.5 text-primary/80" />
                              {idx === 0 ? (
                                <>
                                  <Star className="h-3 w-3 fill-primary text-primary" /> #1 KAPAK
                                </>
                              ) : (
                                `#${idx + 1} AÇI`
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewIdx(idx);
                              }}
                              className="cursor-pointer text-[10px] text-muted-foreground hover:text-primary"
                              title="Büyük Önizlemede Göster"
                            >
                              Önizle
                            </button>
                          </div>

                          {/* Thumbnail Preview (draggable={false} prevents browser file-duplication!) */}
                          <div className="relative aspect-video w-full overflow-hidden bg-black">
                            <img
                              src={src}
                              alt={`Açı ${idx + 1}`}
                              draggable={false}
                              className="pointer-events-none h-full w-full select-none object-contain"
                            />
                          </div>

                          {/* Bottom Action Controls */}
                          <div className="mt-1.5 flex items-center justify-between text-[10px]">
                            {idx === 0 ? (
                              <span className="font-semibold text-primary">Ana Vitrin</span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAsCover(idx);
                                }}
                                className="cursor-pointer font-semibold text-muted-foreground hover:text-primary"
                              >
                                Kapak Yap
                              </button>
                            )}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveImage(idx, -1);
                                }}
                                className="cursor-pointer p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30"
                                title="Sola Taşı"
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === images.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveImage(idx, 1);
                                }}
                                className="cursor-pointer p-0.5 text-muted-foreground hover:text-primary disabled:opacity-30"
                                title="Sağa Taşı"
                              >
                                <ArrowRight className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(idx);
                                }}
                                className="cursor-pointer font-semibold text-destructive hover:underline"
                              >
                                Sil
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
              <button type="submit" className={`${goldBtn} flex-1 py-4`}>
                {editingId
                  ? "Değişiklikleri Kaydet & Yayınla"
                  : "Aracı Koleksiyona Kaydet"}
              </button>
              <button
                type="button"
                onClick={resetCurrentEdit}
                className="inline-flex cursor-pointer items-center justify-center gap-2 border border-amber-500/50 bg-amber-500/10 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-amber-300 transition hover:bg-amber-500/20"
                title={
                  editingId
                    ? "Yaptığınız değişiklikleri geri alıp aracın kayıtlı haline döndürür"
                    : "Formdaki tüm alanları temizler"
                }
              >
                <RotateCcw className="h-4 w-4" />
                {editingId ? "Düzenlemeyi Sıfırla" : "Formu Sıfırla"}
              </button>
            </div>

            {savedMsg && (
              <div className="flex flex-wrap items-center justify-between gap-3 border border-primary bg-primary/10 p-4 text-sm text-primary sm:col-span-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>{savedMsg}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTab("manage")}
                    className="cursor-pointer border border-primary/40 bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
                  >
                    ← Araç Yönetimine Dön
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        clearForm();
                        setSavedMsg("");
                      }}
                      className="cursor-pointer border border-primary/40 bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
                    >
                      + Yeni Araç Ekle
                    </button>
                  )}
                </div>
              </div>
            )}
          </form>
        )}

        {/* TAB 3: CRM INBOX */}
        {tab === "inbox" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border border-primary/40 bg-card p-4 text-xs text-muted-foreground">
              <div>
                <strong className="text-primary">Çift Kanal Talep Sistemi Aktif:</strong>{" "}
                Müşteriler sitedeki "Site Üzerinden Teklif Ver" veya "Özel İthalat Talebi" formunu gönderdiğinde talep hem bu listeye düşer hem de otomatik olarak WhatsApp (`+90 540 061 16 34`) mesaj ekranını hazırlar.
              </div>
              <button
                type="button"
                onClick={resetInquiries}
                className="inline-flex cursor-pointer items-center gap-1.5 border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Varsayılan Talepleri Yükle
              </button>
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

        {/* TAB 4: SHOWCASE, FILTER, 3-TAB MODAL & DATABASE BACKUP SETTINGS */}
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
                Vitrindeki koleksiyon bölümünde hangi filtrelerin müşterilere gösterileceğini buradan tek tıkla açıp kapatabilirsiniz. Yeni eklediğiniz özel kasa, yakıt veya vites tipleri otomatik olarak filtreye dahil edilir.
              </p>

              <div className="space-y-3 text-sm">
                {(
                  [
                    ["showSearchFilter", "Arama Kutusu (Marka / Model Arama)"],
                    ["showYearFilter", "Model Yılı Filtresi"],
                    ["showBodyFilter", "Kasa Tipi (Sınırsız Hibrit Liste) Filtresi"],
                    ["showFuelFilter", "Yakıt Türü (Sınırsız Hibrit Liste) Filtresi"],
                    ["showGearFilter", "Vites Tipi (Sınırsız Hibrit Liste) Filtresi"],
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
                        onChange={(e) => {
                          const next = { ...settings, [key]: e.target.checked };
                          if (
                            (next.modalDefaultTab === "specs" && !next.modalShowSpecsTab) ||
                            (next.modalDefaultTab === "extras" && !next.modalShowExtrasTab) ||
                            (next.modalDefaultTab === "offer" && !next.modalShowOfferTab)
                          ) {
                            if (next.modalShowSpecsTab) next.modalDefaultTab = "specs";
                            else if (next.modalShowExtrasTab) next.modalDefaultTab = "extras";
                            else if (next.modalShowOfferTab) next.modalDefaultTab = "offer";
                          }
                          updateSettings(next);
                        }}
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

            {/* Database & Backup Center */}
            <div className="border border-primary/40 bg-card p-6 md:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-2xl font-semibold">
                    Veritabanı & Veri Kaybı Koruma Merkezi (Cloudflare D1 & JSON)
                  </h2>
                </div>
                <span className="border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  ● Otomatik Anlık Kayıt & Undo Koruması Aktif
                </span>
              </div>

              <div className="mb-5 grid gap-3 sm:grid-cols-4">
                <div className="border border-border bg-background/50 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Kayıtlı Araçlar
                  </div>
                  <div className="font-display text-2xl font-semibold text-primary">
                    {cars.length} Araç
                  </div>
                </div>
                <div className="border border-border bg-background/50 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Toplam Galeri Fotoğrafı
                  </div>
                  <div className="font-display text-2xl font-semibold text-foreground">
                    {cars.reduce((sum, c) => sum + c.images.length, 0)} Kare
                  </div>
                </div>
                <div className="border border-border bg-background/50 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Gelen VIP Talepler (CRM)
                  </div>
                  <div className="font-display text-2xl font-semibold text-foreground">
                    {inquiries.length} Kayıt
                  </div>
                </div>
                <div className="border border-border bg-background/50 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Son Geri Alma Yedeği
                  </div>
                  <div className="truncate pt-1 text-xs font-semibold text-amber-300">
                    {undoSnap ? `${undoSnap.label} (${undoSnap.timestamp})` : "Henüz işlem yok"}
                  </div>
                </div>
              </div>

              <p className="mb-4 text-xs text-muted-foreground">
                Yaptığınız her araç ekleme, düzenleme, sıralama, fotoğraf sürükleme, talep durumu ve filtre ayarı değişikliği tarayıcı veritabanına anında kaydedilir ve bir önceki durum otomatik yedeklenir. Ayrıca tüm veritabanını tek tıkla <strong>JSON Yedek</strong> veya <strong>Cloudflare D1 SQLite (`.sql`)</strong> formatında indirebilir ya da geri yükleyebilirsiniz.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className={goldBtn}
                >
                  <Download className="h-4 w-4" /> JSON Tam Yedek İndir
                </button>

                <button
                  type="button"
                  onClick={handleExportSQL}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 border border-primary/50 bg-primary/10 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary/20"
                >
                  <Database className="h-4 w-4" /> Cloudflare D1 (.sql) Veritabanı İndir
                </button>

                <label className="inline-flex cursor-pointer items-center justify-center gap-2 border border-border bg-background px-5 py-3 text-xs font-semibold uppercase tracking-wider text-foreground transition hover:border-primary hover:text-primary">
                  <Upload className="h-4 w-4" /> JSON Yedekten Geri Yükle
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </label>

                {undoSnap && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 border border-amber-500/50 bg-amber-500/10 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-amber-300 transition hover:bg-amber-500/20"
                  >
                    <Undo2 className="h-4 w-4" /> Son İşlemi Geri Al ({undoSnap.label})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

