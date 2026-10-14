import { useState } from "react";
import {
  Sparkles,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  HelpCircle,
  Sliders,
  Award,
  Compass,
  Edit3,
  X,
  UploadCloud,
  Image,
} from "lucide-react";
import { type SiteCMSConfig, translateTerm, ADMIN_PRESETS } from "@/lib/bycar";

const input =
  "w-full bg-background border border-input px-3.5 py-2 text-xs outline-none focus:border-primary placeholder:text-muted-foreground";
const goldBtn =
  "inline-flex items-center justify-center gap-1.5 bg-gold text-primary-foreground px-5 py-2.5 text-xs font-semibold tracking-wider uppercase shadow-gold hover:brightness-110 transition cursor-pointer disabled:opacity-50";

interface AdminContentTabProps {
  cmsConfig: SiteCMSConfig;
  onSave: (next: SiteCMSConfig, label?: string) => void;
  onReset: () => void;
}

export function AdminContentTab({ cmsConfig, onSave, onReset }: AdminContentTabProps) {
  const [form, setForm] = useState<SiteCMSConfig>(cmsConfig);
  const [msg, setMsg] = useState("");

  // Sub-accordions in Content tab with reload/F5 persistence
  const [activeSection, setActiveSection] = useState<
    "hero" | "stats" | "about" | "services" | "concierge" | "faqs" | "presets"
  >(() => {
    if (typeof window === "undefined") return "hero";
    const validSections = ["hero", "stats", "about", "services", "concierge", "faqs", "presets"];
    const params = new URLSearchParams(window.location.search);
    const sec = params.get("section");
    if (sec && validSections.includes(sec))
      return sec as "hero" | "stats" | "about" | "services" | "concierge" | "faqs" | "presets";
    const stored = window.sessionStorage.getItem("bycar_admin_content_section");
    if (stored && validSections.includes(stored))
      return stored as "hero" | "stats" | "about" | "services" | "concierge" | "faqs" | "presets";
    return "hero";
  });

  const handleSelectSection = (
    sec: "hero" | "stats" | "about" | "services" | "concierge" | "faqs" | "presets",
  ) => {
    setActiveSection(sec);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("bycar_admin_content_section", sec);
      const url = new URL(window.location.href);
      url.searchParams.set("section", sec);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Hero Image Upload States
  const [uploadingHeroDesktop, setUploadingHeroDesktop] = useState(false);
  const [uploadingHeroMobile, setUploadingHeroMobile] = useState(false);
  const [heroUploadMsg, setHeroUploadMsg] = useState("");

  const handleUploadHeroImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "desktop" | "mobile",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token =
      typeof window !== "undefined" ? window.sessionStorage.getItem("bycar_admin_token") : null;
    if (!token) {
      alert("Görsel yüklemek için VIP Yönetici girişi yapmalısınız.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert("Hero görseli 15 MB'tan büyük olamaz.");
      return;
    }

    if (target === "desktop") setUploadingHeroDesktop(true);
    else setUploadingHeroMobile(true);
    setHeroUploadMsg(
      `${target === "desktop" ? "Masaüstü" : "Mobil"} hero görseli Cloudflare R2'ye yükleniyor...`,
    );

    try {
      const uploadRes = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": file.type || "image/webp",
          "x-vehicle-id": "hero",
          "x-file-name": file.name.replace(/[^a-zA-Z0-9._-]/g, "_"),
        },
        body: file,
      });

      if (uploadRes.ok) {
        const resJson = (await uploadRes.json()) as { ok?: boolean; url?: string };
        if (resJson.ok && resJson.url) {
          if (target === "desktop") {
            setForm((prev) => ({
              ...prev,
              hero: { ...prev.hero, bgImage: resJson.url! },
            }));
          } else {
            setForm((prev) => ({
              ...prev,
              hero: { ...prev.hero, bgImageMobile: resJson.url! },
            }));
          }
          setHeroUploadMsg(
            `✓ ${target === "desktop" ? "Masaüstü" : "Mobil"} hero görseli başarıyla yüklendi!`,
          );
          setTimeout(() => setHeroUploadMsg(""), 4500);
        } else {
          alert("Görsel sunucuya yüklenemedi.");
          setHeroUploadMsg("");
        }
      } else {
        const errData = (await uploadRes.json().catch(() => ({}))) as { error?: string };
        alert(errData.error || `Yükleme başarısız (HTTP ${uploadRes.status}).`);
        setHeroUploadMsg("");
      }
    } catch (err) {
      console.error("Hero upload error:", err);
      alert("Görsel yüklenirken bir ağ hatası oluştu.");
      setHeroUploadMsg("");
    } finally {
      if (target === "desktop") setUploadingHeroDesktop(false);
      else setUploadingHeroMobile(false);
      e.target.value = "";
    }
  };

  // Local state for adding new FAQ
  const [newFaq, setNewFaq] = useState({
    qTr: "",
    qEn: "",
    aTr: "",
    aEn: "",
  });

  // Local state for editing existing FAQ
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<{
    qTr: string;
    qEn: string;
    aTr: string;
    aEn: string;
  }>({ qTr: "", qEn: "", aTr: "", aEn: "" });

  const startEditFaq = (f: { id: string; qTr: string; qEn: string; aTr: string; aEn: string }) => {
    setEditingFaqId(f.id);
    setEditingFaq({
      qTr: f.qTr,
      qEn: f.qEn,
      aTr: f.aTr,
      aEn: f.aEn,
    });
  };

  const handleUpdateFaq = () => {
    if (!editingFaqId || !editingFaq.qTr.trim() || !editingFaq.aTr.trim()) return;
    const nextFaqs = form.faqs.map((f) => {
      if (f.id === editingFaqId) {
        return {
          ...f,
          qTr: editingFaq.qTr.trim(),
          qEn: editingFaq.qEn.trim() || editingFaq.qTr.trim(),
          aTr: editingFaq.aTr.trim(),
          aEn: editingFaq.aEn.trim() || editingFaq.aTr.trim(),
        };
      }
      return f;
    });
    const next = { ...form, faqs: nextFaqs };
    setForm(next);
    onSave(next, `SSS sorusu güncellendi: ${editingFaq.qTr.slice(0, 30)}...`);
    setEditingFaqId(null);
    setMsg("✓ Sıkça Sorulan Soru güncellendi ve taslağa kaydedildi.");
    setTimeout(() => setMsg(""), 3500);
  };

  const cancelEditFaq = () => {
    setEditingFaqId(null);
    setEditingFaq({ qTr: "", qEn: "", aTr: "", aEn: "" });
  };

  // Local state for adding preset chip
  const [presetCategory, setPresetCategory] =
    useState<keyof SiteCMSConfig["customPresets"]>("brands");
  const [newPresetValue, setNewPresetValue] = useState("");

  const handleSave = (label = "Site İçerik Ayarları Güncellendi") => {
    onSave(form, label);
    setMsg(
      "✓ Tüm içerik ve kurumsal CMS ayarları yerel taslak olarak kaydedildi; canlı kayıt durumunu üst çubuktan kontrol edin.",
    );
    setTimeout(() => setMsg(""), 4000);
  };

  const handleAddFaq = () => {
    if (!newFaq.qTr.trim() || !newFaq.aTr.trim()) return;
    const item = {
      id: `faq-${Date.now()}`,
      qTr: newFaq.qTr.trim(),
      qEn: newFaq.qEn.trim() || newFaq.qTr.trim(),
      aTr: newFaq.aTr.trim(),
      aEn: newFaq.aEn.trim() || newFaq.aTr.trim(),
    };
    const next = {
      ...form,
      faqs: [...(form.faqs || []), item],
    };
    setForm(next);
    onSave(next, `Yeni SSS eklendi: ${item.qTr.slice(0, 30)}...`);
    setNewFaq({ qTr: "", qEn: "", aTr: "", aEn: "" });
    setMsg(
      "✓ Yeni Sıkça Sorulan Soru taslağa eklendi; canlı kayıt durumunu üst çubuktan kontrol edin.",
    );
    setTimeout(() => setMsg(""), 3500);
  };

  const handleDeleteFaq = (id: string) => {
    if (!window.confirm("Bu sıkça sorulan soru silinsin mi?")) return;
    if (editingFaqId === id) {
      setEditingFaqId(null);
    }
    const next = {
      ...form,
      faqs: form.faqs.filter((f) => f.id !== id),
    };
    setForm(next);
    onSave(next, "SSS maddesi silindi");
  };

  const handleAddPreset = () => {
    const trimmed = newPresetValue.trim();
    if (!trimmed) return;
    if (presetCategory === "extras") {
      const current = form.customPresets?.extras || [];
      if (!current.some((e) => e.tr.toLowerCase() === trimmed.toLowerCase())) {
        const next = {
          ...form,
          customPresets: {
            ...form.customPresets,
            extras: [...current, { tr: trimmed, en: translateTerm(trimmed, "en") }],
          },
        };
        setForm(next);
        onSave(next, `Yeni donanım çipi eklendi: ${trimmed}`);
      }
    } else {
      const current = (form.customPresets?.[presetCategory] as string[]) || [];
      if (!current.includes(trimmed)) {
        const next = {
          ...form,
          customPresets: {
            ...form.customPresets,
            [presetCategory]: [...current, trimmed],
          },
        };
        setForm(next);
        onSave(next, `Yeni ${presetCategory} çipi eklendi: ${trimmed}`);
      }
    }
    setNewPresetValue("");
    setMsg(
      `✓ Yeni "${trimmed}" etiketi taslağa eklendi; canlı kayıt durumunu üst çubuktan kontrol edin.`,
    );
    setTimeout(() => setMsg(""), 3500);
  };

  const handleDeletePreset = (cat: keyof SiteCMSConfig["customPresets"], itemText: string) => {
    if (!window.confirm(`"${itemText}" hazır etiketi silinsin mi?`)) return;
    if (cat === "extras") {
      const next = {
        ...form,
        customPresets: {
          ...form.customPresets,
          extras: (form.customPresets?.extras || []).filter((e) => e.tr !== itemText),
        },
      };
      setForm(next);
      onSave(next, `Donanım çipi silindi: ${itemText}`);
    } else {
      const current = (form.customPresets?.[cat] as string[]) || [];
      const next = {
        ...form,
        customPresets: {
          ...form.customPresets,
          [cat]: current.filter((x) => x !== itemText),
        },
      };
      setForm(next);
      onSave(next, `${cat} çipi silindi: ${itemText}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-semibold">
              Site İçeriği & Kurumsal CMS Yöneticisi
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Hero banner, sayaçlar, hakkımızda, 4 hizmet kartı, concierge adımları ve SSS'yi tek
            satır kod yazmadan yönetin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {msg && (
            <span className="border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              {msg}
            </span>
          )}
          <button type="button" onClick={() => handleSave()} className={goldBtn}>
            <Save className="h-4 w-4" /> Tüm Değişiklikleri Kaydet
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="grid grid-cols-2 gap-1 border border-border bg-background/50 p-1 sm:grid-cols-4 lg:grid-cols-7 text-xs font-semibold uppercase tracking-wider">
        {(
          [
            ["hero", "Hero Banner"],
            ["stats", "4 Sayaç"],
            ["about", "Hakkımızda"],
            ["services", "Hizmetler"],
            ["concierge", "Concierge"],
            ["faqs", "SSS"],
            ["presets", "Çip Yöneticisi"],
          ] as const
        ).map(([key, title]) => (
          <button
            key={key}
            type="button"
            onClick={() => handleSelectSection(key)}
            className={`cursor-pointer px-3 py-2 text-center transition ${
              activeSection === key
                ? "bg-primary text-primary-foreground font-bold shadow"
                : "text-muted-foreground hover:bg-card hover:text-foreground"
            }`}
          >
            {title}
          </button>
        ))}
      </div>

      {/* 1. HERO SECTION EDITOR */}
      {activeSection === "hero" && (
        <div className="border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-semibold">
              1. Hero Karşılama Alanı (Banner, Başlık & CTA Butonları)
            </h3>
          </div>

          {/* Dual Hero Upload: Desktop (Wide) + Mobile (Car Focused) */}
          <div className="grid gap-6 md:grid-cols-2 border border-border bg-background/50 p-4">
            {/* Desktop Hero Image */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Image className="h-4 w-4" /> Masaüstü & Tablet Hero Görseli
                </label>
                {form.hero.bgImage && form.hero.bgImage !== "/hero.webp" && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, hero: { ...form.hero, bgImage: "/hero.webp" } })
                    }
                    className="text-[10px] text-destructive hover:underline cursor-pointer"
                  >
                    Varsayılana Sıfırla
                  </button>
                )}
              </div>

              {/* Direct PC File Upload Button */}
              <label className="flex cursor-pointer items-center justify-center gap-2 border border-primary/50 bg-background px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50">
                <UploadCloud className="h-4 w-4 shrink-0" />
                <span>
                  {uploadingHeroDesktop
                    ? "Görsel Yükleniyor..."
                    : "Bilgisayardan Masaüstü Görseli Seç (PNG / JPG / WEBP)"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingHeroDesktop}
                  onChange={(e) => handleUploadHeroImage(e, "desktop")}
                  className="hidden"
                />
              </label>

              {/* Preview Thumbnail */}
              {form.hero.bgImage && (
                <div className="relative aspect-video w-full max-w-xs overflow-hidden border border-border bg-black">
                  <img
                    src={form.hero.bgImage}
                    alt="Masaüstü Hero Önizleme"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/75 px-1.5 py-0.5 text-[9px] text-zinc-300">
                    Masaüstü (16:9 / 21:9)
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Veya Doğrudan Görsel URL
                </label>
                <input
                  value={form.hero.bgImage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hero: { ...form.hero, bgImage: e.target.value },
                    })
                  }
                  className={input}
                  placeholder="/hero.webp"
                />
              </div>
            </div>

            {/* Mobile Hero Image (Car Focused) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Image className="h-4 w-4" /> Mobil Hero Görseli (Araba Odaklı)
                </label>
                {form.hero.bgImageMobile && form.hero.bgImageMobile !== "/hero-mobile.webp" && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        hero: { ...form.hero, bgImageMobile: "/hero-mobile.webp" },
                      })
                    }
                    className="text-[10px] text-destructive hover:underline cursor-pointer"
                  >
                    Varsayılana Sıfırla
                  </button>
                )}
              </div>

              {/* Direct PC File Upload Button */}
              <label className="flex cursor-pointer items-center justify-center gap-2 border border-primary/50 bg-background px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50">
                <UploadCloud className="h-4 w-4 shrink-0" />
                <span>
                  {uploadingHeroMobile
                    ? "Görsel Yükleniyor..."
                    : "Bilgisayardan Mobil Görseli Seç (PNG / JPG / WEBP)"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingHeroMobile}
                  onChange={(e) => handleUploadHeroImage(e, "mobile")}
                  className="hidden"
                />
              </label>

              {/* Preview Thumbnail */}
              {form.hero.bgImageMobile && (
                <div
                  className="relative w-48 overflow-hidden border border-border bg-black"
                  style={{ aspectRatio: "1832 / 1280" }}
                >
                  <img
                    src={form.hero.bgImageMobile}
                    alt="Mobil Hero Önizleme"
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/75 px-1.5 py-0.5 text-[9px] text-zinc-300">
                    Mobil Hero
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Veya Doğrudan Mobil Görsel URL
                </label>
                <input
                  value={form.hero.bgImageMobile || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hero: { ...form.hero, bgImageMobile: e.target.value },
                    })
                  }
                  className={input}
                  placeholder="/hero-mobile.webp"
                />
              </div>
            </div>
          </div>

          {heroUploadMsg && (
            <div className="rounded border border-primary/40 bg-primary/10 p-2.5 text-xs font-semibold text-primary">
              {heroUploadMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Üst Rozet (Türkçe)
              </label>
              <input
                value={form.hero.badgeTr}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hero: { ...form.hero, badgeTr: e.target.value },
                  })
                }
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Badge (İngilizce)
              </label>
              <input
                value={form.hero.badgeEn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hero: { ...form.hero, badgeEn: e.target.value },
                  })
                }
                className={input}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              Ana Başlık (Türkçe)
            </label>
            <input
              value={form.hero.titleTr}
              onChange={(e) =>
                setForm({
                  ...form,
                  hero: { ...form.hero, titleTr: e.target.value },
                })
              }
              className={input}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              Main Headline (İngilizce)
            </label>
            <input
              value={form.hero.titleEn}
              onChange={(e) =>
                setForm({
                  ...form,
                  hero: { ...form.hero, titleEn: e.target.value },
                })
              }
              className={input}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              Alt Açıklama (Türkçe)
            </label>
            <textarea
              value={form.hero.subtitleTr}
              onChange={(e) =>
                setForm({
                  ...form,
                  hero: { ...form.hero, subtitleTr: e.target.value },
                })
              }
              rows={3}
              className={input}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              Subtitle Description (İngilizce)
            </label>
            <textarea
              value={form.hero.subtitleEn}
              onChange={(e) =>
                setForm({
                  ...form,
                  hero: { ...form.hero, subtitleEn: e.target.value },
                })
              }
              rows={3}
              className={input}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                1. CTA Butonu (TR)
              </label>
              <input
                value={form.hero.primaryBtnTextTr}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hero: { ...form.hero, primaryBtnTextTr: e.target.value },
                  })
                }
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                1. CTA Butonu (EN)
              </label>
              <input
                value={form.hero.primaryBtnTextEn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hero: { ...form.hero, primaryBtnTextEn: e.target.value },
                  })
                }
                className={input}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                2. CTA Butonu (TR)
              </label>
              <input
                value={form.hero.secondaryBtnTextTr}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hero: { ...form.hero, secondaryBtnTextTr: e.target.value },
                  })
                }
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                2. CTA Butonu (EN)
              </label>
              <input
                value={form.hero.secondaryBtnTextEn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hero: { ...form.hero, secondaryBtnTextEn: e.target.value },
                  })
                }
                className={input}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. STATS EDITOR */}
      {activeSection === "stats" && (
        <div className="border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-semibold">
              2. 4 Prestij Sayaç Kartı (Hero Altı Metrikler)
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {form.stats.map((st, idx) => (
              <div key={idx} className="border border-border bg-background/50 p-4 space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                  SAYAÇ #{idx + 1}
                </span>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">
                    Değer (Sayı / Metin)
                  </label>
                  <input
                    value={st.value}
                    onChange={(e) => {
                      const nextStats = [...form.stats];
                      nextStats[idx] = { ...st, value: e.target.value };
                      setForm({ ...form, stats: nextStats });
                    }}
                    className={input}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">
                    Başlık (Türkçe)
                  </label>
                  <input
                    value={st.labelTr}
                    onChange={(e) => {
                      const nextStats = [...form.stats];
                      nextStats[idx] = { ...st, labelTr: e.target.value };
                      setForm({ ...form, stats: nextStats });
                    }}
                    className={input}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">
                    Label (English)
                  </label>
                  <input
                    value={st.labelEn}
                    onChange={(e) => {
                      const nextStats = [...form.stats];
                      nextStats[idx] = { ...st, labelEn: e.target.value };
                      setForm({ ...form, stats: nextStats });
                    }}
                    className={input}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ABOUT SECTION EDITOR */}
      {activeSection === "about" && (
        <div className="border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Compass className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-semibold">
              3. Kurucumuzun Vizyonu & Hakkımızda
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Bölüm Başlığı (Türkçe)
              </label>
              <input
                value={form.about.headingTr}
                onChange={(e) =>
                  setForm({
                    ...form,
                    about: { ...form.about, headingTr: e.target.value },
                  })
                }
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Section Heading (English)
              </label>
              <input
                value={form.about.headingEn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    about: { ...form.about, headingEn: e.target.value },
                  })
                }
                className={input}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Kurumsal Hikaye & Tanıtım (Türkçe)
              </label>
              <textarea
                value={form.about.storyTr}
                onChange={(e) =>
                  setForm({
                    ...form,
                    about: { ...form.about, storyTr: e.target.value },
                  })
                }
                rows={5}
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Brand Story & Heritage (English)
              </label>
              <textarea
                value={form.about.storyEn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    about: { ...form.about, storyEn: e.target.value },
                  })
                }
                rows={5}
                className={input}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Öne Çıkan Vurgu Metni (Türkçe)
              </label>
              <input
                value={form.about.highlightTr}
                onChange={(e) =>
                  setForm({
                    ...form,
                    about: { ...form.about, highlightTr: e.target.value },
                  })
                }
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Highlight Text (English)
              </label>
              <input
                value={form.about.highlightEn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    about: { ...form.about, highlightEn: e.target.value },
                  })
                }
                className={input}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Kurumsal Slogan (Türkçe)
              </label>
              <input
                value={form.about.sloganTr}
                onChange={(e) =>
                  setForm({
                    ...form,
                    about: { ...form.about, sloganTr: e.target.value },
                  })
                }
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Corporate Slogan (English)
              </label>
              <input
                value={form.about.sloganEn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    about: { ...form.about, sloganEn: e.target.value },
                  })
                }
                className={input}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. SERVICES EDITOR */}
      {activeSection === "services" && (
        <div className="border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-semibold">4. 4 VIP Hizmet Kartı</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {form.services.map((srv, idx) => (
              <div
                key={srv.id || idx}
                className="border border-border bg-background/50 p-4 space-y-3"
              >
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                  HİZMET #{idx + 1}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">
                      Başlık (TR)
                    </label>
                    <input
                      value={srv.titleTr}
                      onChange={(e) => {
                        const copy = [...form.services];
                        copy[idx] = { ...srv, titleTr: e.target.value };
                        setForm({ ...form, services: copy });
                      }}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">
                      Title (EN)
                    </label>
                    <input
                      value={srv.titleEn}
                      onChange={(e) => {
                        const copy = [...form.services];
                        copy[idx] = { ...srv, titleEn: e.target.value };
                        setForm({ ...form, services: copy });
                      }}
                      className={input}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">
                    Açıklama (TR)
                  </label>
                  <textarea
                    value={srv.descTr}
                    onChange={(e) => {
                      const copy = [...form.services];
                      copy[idx] = { ...srv, descTr: e.target.value };
                      setForm({ ...form, services: copy });
                    }}
                    rows={2}
                    className={input}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">
                    Description (EN)
                  </label>
                  <textarea
                    value={srv.descEn}
                    onChange={(e) => {
                      const copy = [...form.services];
                      copy[idx] = { ...srv, descEn: e.target.value };
                      setForm({ ...form, services: copy });
                    }}
                    rows={2}
                    className={input}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. CONCIERGE STEPS EDITOR */}
      {activeSection === "concierge" && (
        <div className="border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Compass className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-semibold">
              5. 4 Adımlı Uluslararası İthalat & Concierge Süreci
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {form.conciergeSteps.map((st, idx) => (
              <div
                key={st.step || idx}
                className="border border-border bg-background/50 p-4 space-y-3"
              >
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary">
                  ADIM {st.step}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">
                      Başlık (TR)
                    </label>
                    <input
                      value={st.titleTr}
                      onChange={(e) => {
                        const copy = [...form.conciergeSteps];
                        copy[idx] = { ...st, titleTr: e.target.value };
                        setForm({ ...form, conciergeSteps: copy });
                      }}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">
                      Title (EN)
                    </label>
                    <input
                      value={st.titleEn}
                      onChange={(e) => {
                        const copy = [...form.conciergeSteps];
                        copy[idx] = { ...st, titleEn: e.target.value };
                        setForm({ ...form, conciergeSteps: copy });
                      }}
                      className={input}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">
                    Açıklama (TR)
                  </label>
                  <textarea
                    value={st.descTr}
                    onChange={(e) => {
                      const copy = [...form.conciergeSteps];
                      copy[idx] = { ...st, descTr: e.target.value };
                      setForm({ ...form, conciergeSteps: copy });
                    }}
                    rows={2}
                    className={input}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">
                    Description (EN)
                  </label>
                  <textarea
                    value={st.descEn}
                    onChange={(e) => {
                      const copy = [...form.conciergeSteps];
                      copy[idx] = { ...st, descEn: e.target.value };
                      setForm({ ...form, conciergeSteps: copy });
                    }}
                    rows={2}
                    className={input}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. FAQS CRUD */}
      {activeSection === "faqs" && (
        <div className="border border-border bg-card p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-semibold">
              6. Sıkça Sorulan Sorular (SSS) Yönetimi (CRUD)
            </h3>
          </div>

          {/* Add New FAQ Form */}
          <div className="border border-primary/40 bg-background/60 p-4 space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-primary">
              + Yeni Sıkça Sorulan Soru Ekle
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">
                  Soru (Türkçe)
                </label>
                <input
                  value={newFaq.qTr}
                  onChange={(e) => setNewFaq({ ...newFaq, qTr: e.target.value })}
                  placeholder="Örn: Araçlar ekspertiz garantili mi?"
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">
                  Question (English)
                </label>
                <input
                  value={newFaq.qEn}
                  onChange={(e) => setNewFaq({ ...newFaq, qEn: e.target.value })}
                  placeholder="Örn: Are all vehicles guaranteed?"
                  className={input}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">
                  Cevap (Türkçe)
                </label>
                <textarea
                  value={newFaq.aTr}
                  onChange={(e) => setNewFaq({ ...newFaq, aTr: e.target.value })}
                  rows={3}
                  placeholder="Detaylı cevap açıklaması..."
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">
                  Answer (English)
                </label>
                <textarea
                  value={newFaq.aEn}
                  onChange={(e) => setNewFaq({ ...newFaq, aEn: e.target.value })}
                  rows={3}
                  placeholder="English answer description..."
                  className={input}
                />
              </div>
            </div>
            <button type="button" onClick={handleAddFaq} className={`${goldBtn} !py-2`}>
              <Plus className="h-3.5 w-3.5" /> Soruyu SSS'ye Ekle
            </button>
          </div>

          {/* Existing FAQs List */}
          <div className="space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              Yayındaki Sorular ({form.faqs.length})
            </span>
            <div className="space-y-2">
              {form.faqs.map((f, idx) =>
                editingFaqId === f.id ? (
                  <div
                    key={f.id || idx}
                    className="border-2 border-primary bg-background/80 p-4 space-y-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-primary/30 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Soruyu Düzenle (#{idx + 1})
                      </span>
                      <button
                        type="button"
                        onClick={cancelEditFaq}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        title="Vazgeç"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-muted-foreground">
                          Soru (Türkçe)
                        </label>
                        <input
                          value={editingFaq.qTr}
                          onChange={(e) => setEditingFaq({ ...editingFaq, qTr: e.target.value })}
                          className={input}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-muted-foreground">
                          Question (English)
                        </label>
                        <input
                          value={editingFaq.qEn}
                          onChange={(e) => setEditingFaq({ ...editingFaq, qEn: e.target.value })}
                          className={input}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-muted-foreground">
                          Cevap (Türkçe)
                        </label>
                        <textarea
                          value={editingFaq.aTr}
                          onChange={(e) => setEditingFaq({ ...editingFaq, aTr: e.target.value })}
                          rows={3}
                          className={input}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-muted-foreground">
                          Answer (English)
                        </label>
                        <textarea
                          value={editingFaq.aEn}
                          onChange={(e) => setEditingFaq({ ...editingFaq, aEn: e.target.value })}
                          rows={3}
                          className={input}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleUpdateFaq}
                        className={`${goldBtn} !py-1.5`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Değişiklikleri Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditFaq}
                        className="cursor-pointer border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Vazgeç
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={f.id || idx}
                    className="border border-border bg-background/50 p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-sm text-foreground">
                          {idx + 1}. {f.qTr}
                        </div>
                        <div className="text-[11px] text-primary">{f.qEn}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditFaq(f)}
                          className="inline-flex cursor-pointer items-center gap-1 border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                          title="Soruyu Düzenle"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFaq(f.id)}
                          className="cursor-pointer p-1 text-muted-foreground hover:text-destructive"
                          title="Soruyu Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.aTr}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. PRESET CHIPS MANAGER */}
      {activeSection === "presets" && (
        <div className="border border-border bg-card p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sliders className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-semibold">
              7. Kalıcı Hazır Çip (Preset) Yöneticisi
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Araç ekleme ve filtreleme ekranlarında görünen hazır butonları buradan kalıcı olarak
            ekleyebilir veya silebilirsiniz. Koda bağımlılık %0'dır.
          </p>

          {/* Add Preset Bar */}
          <div className="flex flex-wrap items-end gap-3 border border-primary/40 bg-background/60 p-4">
            <div>
              <label className="mb-1 block text-[11px] text-muted-foreground">Hedef Kategori</label>
              <select
                value={presetCategory}
                onChange={(e) =>
                  setPresetCategory(e.target.value as keyof SiteCMSConfig["customPresets"])
                }
                className={input}
              >
                <option value="brands">Markalar (Brands)</option>
                <option value="packages">Paket / Seri (Packages)</option>
                <option value="bodies">Kasa Tipleri (Bodies)</option>
                <option value="fuels">Yakıt Türleri (Fuels)</option>
                <option value="gears">Vites Tipleri (Gears)</option>
                <option value="powers">Motor Güçleri (Powers)</option>
                <option value="colors">Renk Kombinasyonları (Colors)</option>
                <option value="expertises">Ekspertiz Durumları (Expertise)</option>
                <option value="tramers">Tramer Durumları (Tramers)</option>
                <option value="extras">Donanım & Opsiyonlar (Extras)</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-[11px] text-muted-foreground">
                Yeni Etiket Metni
              </label>
              <input
                value={newPresetValue}
                onChange={(e) => setNewPresetValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPreset();
                  }
                }}
                placeholder="Örn: Shelby, Titanyum Gri, Elektrikli..."
                className={input}
              />
            </div>
            <button type="button" onClick={handleAddPreset} className={`${goldBtn} !py-2`}>
              <Plus className="h-3.5 w-3.5" /> Kalıcı Çip Ekle
            </button>
          </div>

          {/* Category Chips List */}
          <div className="space-y-4">
            {(
              [
                ["brands", "Özel Eklenen Markalar"],
                ["packages", "Özel Eklenen Paketler"],
                ["bodies", "Özel Eklenen Kasa Tipleri"],
                ["fuels", "Özel Eklenen Yakıt Tipleri"],
                ["gears", "Özel Eklenen Vites Tipleri"],
                ["powers", "Özel Eklenen Motor Güçleri"],
                ["colors", "Özel Eklenen Renkler"],
                ["expertises", "Özel Eklenen Ekspertiz Kalıpları"],
                ["tramers", "Özel Eklenen Tramer Durumları"],
              ] as const
            ).map(([catKey, title]) => {
              const list = (form.customPresets?.[catKey] as string[]) || [];
              return (
                <div key={catKey} className="border border-border bg-background/40 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>
                      {title} ({list.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {list.length === 0 ? (
                      <span className="text-[11px] italic text-muted-foreground">
                        Henüz özel çip eklenmedi (Varsayılanlar aktif).
                      </span>
                    ) : (
                      list.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1.5 border border-primary/50 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => handleDeletePreset(catKey, item)}
                            className="cursor-pointer text-muted-foreground hover:text-destructive"
                            title="Çipi Sil"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {/* Custom Extras */}
            <div className="border border-border bg-background/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>
                  Özel Eklenen Donanım & Opsiyonlar ({(form.customPresets?.extras || []).length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(form.customPresets?.extras || []).length === 0 ? (
                  <span className="text-[11px] italic text-muted-foreground">
                    Henüz özel donanım çipi eklenmedi.
                  </span>
                ) : (
                  (form.customPresets?.extras || []).map((ex) => (
                    <span
                      key={ex.tr}
                      className="inline-flex items-center gap-1.5 border border-primary/50 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                    >
                      {ex.tr}
                      <button
                        type="button"
                        onClick={() => handleDeletePreset("extras", ex.tr)}
                        className="cursor-pointer text-muted-foreground hover:text-destructive"
                        title="Donanımı Sil"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
