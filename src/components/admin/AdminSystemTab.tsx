import { useState } from "react";
import {
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  Instagram,
  Eye,
  Lock,
  Database,
  Cloud,
  Download,
  Upload,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Shield,
  Radio,
  FileCode2,
  Trash2,
} from "lucide-react";
import {
  type SiteCMSConfig,
  type UndoSnapshot,
  setCustomAdminPassword,
  exportD1SqlDump,
  exportDatabaseJSON,
  importDatabaseJSON,
  clearAllBrowserStorage,
} from "@/lib/bycar";

const input =
  "w-full bg-background border border-input px-3.5 py-2 text-xs outline-none focus:border-primary placeholder:text-muted-foreground";
const goldBtn =
  "inline-flex items-center justify-center gap-1.5 bg-gold text-primary-foreground px-5 py-2.5 text-xs font-semibold tracking-wider uppercase shadow-gold hover:brightness-110 transition cursor-pointer disabled:opacity-50";

interface AdminSystemTabProps {
  cmsConfig: SiteCMSConfig;
  onSave: (next: SiteCMSConfig, label?: string) => void;
  onReset: () => void;
  carsCount: number;
  inquiriesCount: number;
  undoSnap: UndoSnapshot | null;
  onRestoreUndo: () => void;
  onSyncServer: () => Promise<void>;
  isSyncing: boolean;
  onPasswordChanged: () => void;
}

export function AdminSystemTab({
  cmsConfig,
  onSave,
  onReset,
  carsCount,
  inquiriesCount,
  undoSnap,
  onRestoreUndo,
  onSyncServer,
  isSyncing,
  onPasswordChanged,
}: AdminSystemTabProps) {
  const [form, setForm] = useState<SiteCMSConfig>(cmsConfig);
  const [msg, setMsg] = useState("");
  const [serverMsg, setServerMsg] = useState("");
  const [gcRunning, setGcRunning] = useState(false);
  const [gcMsg, setGcMsg] = useState("");

  // Password change form
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ text: string; error: boolean } | null>(null);

  const handleSave = (label = "Sistem & İletişim Ayarları Güncellendi") => {
    onSave(form, label);
    setMsg("✓ İletişim bilgileri ve şalterler başarıyla kaydedildi.");
    setTimeout(() => setMsg(""), 4000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPw.trim()) {
      setPwMsg({ text: "Lütfen geçerli bir yeni şifre girin.", error: true });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ text: "Yönetici şifresi en az 6 karakter olmalıdır.", error: true });
      return;
    }
    if (newPw !== newPwConfirm) {
      setPwMsg({ text: "Şifreler birbiriyle eşleşmiyor.", error: true });
      return;
    }

    try {
      await setCustomAdminPassword(newPw);
      setPwMsg({
        text: "✓ Yönetici şifreniz başarıyla güncellendi! Yeni şifreniz anında aktiftir.",
        error: false,
      });
      setNewPw("");
      setNewPwConfirm("");
      onPasswordChanged();
    } catch (error) {
      setPwMsg({
        text: error instanceof Error ? error.message : "Şifre güncellenirken bir hata oluştu.",
        error: true,
      });
    }
  };

  const handleSyncWithServer = async () => {
    setServerMsg("Cloudflare D1 sunucusuyla senkronize ediliyor...");
    try {
      await onSyncServer();
      setServerMsg("✓ Cloudflare D1 sunucusuyla senkronizasyon başarılı!");
      setTimeout(() => setServerMsg(""), 4000);
    } catch {
      setServerMsg("⚠️ Sunucu senkronizasyonunda hata oluştu.");
      setTimeout(() => setServerMsg(""), 4000);
    }
  };

  const handleRunMediaGc = async () => {
    const token =
      typeof window !== "undefined" ? window.sessionStorage.getItem("bycar_admin_token") : null;
    if (!token) {
      setGcMsg("⚠️ Medya temizliği için oturum açmalısınız.");
      return;
    }
    setGcRunning(true);
    setGcMsg("R2 Medya deposu taranıyor ve yetim dosyalar temizleniyor...");
    try {
      let cursor: string | undefined = undefined;
      let totalDeleted = 0;
      let totalScanned = 0;
      let totalRetained = 0;
      let page = 0;

      do {
        page++;
        setGcMsg(`R2 kova taraması yürütülüyor (Sayfa ${page})...`);
        const res = await fetch("/api/admin/media/gc", {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ mode: "full", autoDrain: true, cursor }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          ok: boolean;
          bucketScan?: {
            scanned: number;
            historicalDeleted: number;
            activeRetained: number;
            truncated: boolean;
            nextCursor?: string;
          };
          queue?: { deleted: number };
        };

        if (data.ok) {
          totalDeleted += (data.bucketScan?.historicalDeleted || 0) + (data.queue?.deleted || 0);
          totalScanned += data.bucketScan?.scanned || 0;
          totalRetained += data.bucketScan?.activeRetained || 0;
          cursor = data.bucketScan?.truncated ? data.bucketScan.nextCursor : undefined;
        } else {
          break;
        }
      } while (cursor && page < 20);

      setGcMsg(
        `✓ Medya temizliği tamamlandı: ${totalDeleted} yetim görsel silindi, ${totalRetained} aktif görsel muhafaza edildi (${totalScanned} nesne incelendi).`,
      );
      setTimeout(() => setGcMsg(""), 8000);
    } catch (err) {
      setGcMsg(`⚠️ Medya temizliğinde hata oluştu: ${String(err)}`);
      setTimeout(() => setGcMsg(""), 6000);
    } finally {
      setGcRunning(false);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        const res = importDatabaseJSON(text);
        if (res.ok) {
          setMsg(res.message);
          setTimeout(() => setMsg(""), 4500);
        } else {
          setMsg(`Hata: ${res.message}`);
          setTimeout(() => setMsg(""), 4500);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-semibold">
              İletişim Bilgileri, Bölüm Şalterleri & Canlı D1 Sunucu
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Telefon, WhatsApp, adres, vitrindeki bölümleri anında gizleyip açma ve Cloudflare D1
            canlı senkronizasyonu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {msg && (
            <span className="border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              {msg}
            </span>
          )}
          <button type="button" onClick={() => handleSave()} className={goldBtn}>
            <Save className="h-4 w-4" /> Ayarları Kaydet
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. SHOWROOM CONTACT & SOCIAL */}
        <div className="border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Phone className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-semibold">
              1. Showroom İletişim & Sosyal Medya
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Telefon (Arama İçin e.g. +90 540 061 16 34)
              </label>
              <input
                value={form.contact.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contact: { ...form.contact, phone: e.target.value },
                  })
                }
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Telefon Görünümü (e.g. +90 (540) 061 16 34)
              </label>
              <input
                value={form.contact.phoneDisplay}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contact: { ...form.contact, phoneDisplay: e.target.value },
                  })
                }
                className={input}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                WhatsApp Numarası
              </label>
              <input
                value={form.contact.whatsapp}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contact: { ...form.contact, whatsapp: e.target.value },
                  })
                }
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Resmi E-Posta
              </label>
              <input
                value={form.contact.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contact: { ...form.contact, email: e.target.value },
                  })
                }
                className={input}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              Showroom Adresi
            </label>
            <input
              value={form.contact.address}
              onChange={(e) =>
                setForm({
                  ...form,
                  contact: { ...form.contact, address: e.target.value },
                })
              }
              className={input}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Çalışma Saatleri (Türkçe)
              </label>
              <input
                value={form.contact.hoursTr}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contact: { ...form.contact, hoursTr: e.target.value },
                  })
                }
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Working Hours (English)
              </label>
              <input
                value={form.contact.hoursEn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contact: { ...form.contact, hoursEn: e.target.value },
                  })
                }
                className={input}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Google Maps Bağlantısı
              </label>
              <input
                value={form.contact.mapsUrl}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contact: { ...form.contact, mapsUrl: e.target.value },
                  })
                }
                className={input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                Instagram Profili (URL)
              </label>
              <input
                value={form.contact.instagramUrl}
                onChange={(e) =>
                  setForm({
                    ...form,
                    contact: { ...form.contact, instagramUrl: e.target.value },
                  })
                }
                className={input}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              WhatsApp Teklif Şablonu (Araç için {"{car}"} parametresi kullanılır)
            </label>
            <textarea
              value={form.contact.whatsappOfferTemplate}
              onChange={(e) =>
                setForm({
                  ...form,
                  contact: { ...form.contact, whatsappOfferTemplate: e.target.value },
                })
              }
              rows={2}
              className={input}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
              WhatsApp İthalat Şablonu ({"{model}"}, {"{year}"}, {"{budget}"} parametreleri)
            </label>
            <textarea
              value={form.contact.whatsappImportTemplate}
              onChange={(e) =>
                setForm({
                  ...form,
                  contact: { ...form.contact, whatsappImportTemplate: e.target.value },
                })
              }
              rows={2}
              className={input}
            />
          </div>
        </div>

        {/* 2. SECTION VISIBILITY SWITCHES */}
        <div className="space-y-6">
          <div className="border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Eye className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl font-semibold">
                2. Vitrin Bölüm Göster / Gizle Şalterleri
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Vitrinde hangi bölümlerin açık olacağını tek tıkla açıp kapatabilirsiniz. Gizlenen
              bölümler vitrinde ve menüde otomatik olarak gizlenir.
            </p>

            <div className="space-y-2.5 text-sm">
              {(
                [
                  ["showHeroStats", "Hero Altı 4 Sayaç Metrikleri"],
                  ["showAbout", "Kurucumuzun Vizyonu & Hakkımızda"],
                  ["showServices", "4 VIP Hizmet Kartı"],
                  ["showConcierge", "4 Adımlı Concierge & İthalat Süreci"],
                  ["showTestimonials", "Müşteri Yorumları & Referanslar"],
                  ["showFaq", "Sıkça Sorulan Sorular (SSS)"],
                  ["showFloatingWhatsapp", "Kayan VIP WhatsApp Danışman Butonu"],
                ] as const
              ).map(([key, label]) => {
                const val = Boolean(form.sectionVisibility[key]);
                return (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center justify-between border border-border bg-background/50 px-4 py-3 transition hover:border-primary/50"
                  >
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={(e) => {
                        const next = {
                          ...form,
                          sectionVisibility: {
                            ...form.sectionVisibility,
                            [key]: e.target.checked,
                          },
                        };
                        setForm(next);
                        onSave(next, `Şalter değiştirildi: ${label}`);
                      }}
                      className="h-4 w-4 accent-amber-500"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. ADMIN PASSWORD SECURITY */}
          <div className="border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <KeyRound className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl font-semibold">
                3. Yönetici Şifresi Değiştirme (PBKDF2)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Panel giriş şifresini doğrudan buradan değiştirebilirsiniz. Şifreniz PBKDF2 (SHA-256)
              kriptografik hash olarak güvenle saklanır.
            </p>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                    Yeni Yönetici Şifresi
                  </label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="En az 6 karakter"
                    className={input}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
                    Yeni Şifre Tekrar
                  </label>
                  <input
                    type="password"
                    value={newPwConfirm}
                    onChange={(e) => setNewPwConfirm(e.target.value)}
                    placeholder="Şifreyi tekrar yazın"
                    className={input}
                  />
                </div>
              </div>

              {pwMsg && (
                <div
                  className={`p-2.5 text-xs font-semibold ${
                    pwMsg.error
                      ? "border border-destructive/50 bg-destructive/10 text-destructive"
                      : "border border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  {pwMsg.text}
                </div>
              )}

              <button type="submit" className={`${goldBtn} !py-2`}>
                <Lock className="h-3.5 w-3.5" /> Şifreyi Güvenle Güncelle
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 4. CLOUDFLARE D1 LIVE SERVER & DATABASE CENTER */}
      <div className="border border-primary/40 bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl font-semibold">
              4. Cloudflare D1 Canlı Sunucu Senkronizasyonu & Yedekleme
            </h3>
          </div>
          <span className="border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            ● Server API: /api/cms · D1 Bağlantısı Hazır
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="border border-border bg-background/50 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Kayıtlı Araç Sayısı
            </div>
            <div className="font-display text-2xl font-semibold text-primary">{carsCount} Araç</div>
          </div>
          <div className="border border-border bg-background/50 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Gelen VIP Talepler (CRM)
            </div>
            <div className="font-display text-2xl font-semibold text-foreground">
              {inquiriesCount} Talep
            </div>
          </div>
          <div className="border border-border bg-background/50 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Aktif Çip Havuzu
            </div>
            <div className="font-display text-2xl font-semibold text-foreground">
              {Object.values(form.customPresets || {}).reduce(
                (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
                0,
              )}{" "}
              Özel Çip
            </div>
          </div>
          <div className="border border-border bg-background/50 p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Son Geri Alma Yedeği
            </div>
            <div className="truncate pt-1 text-xs font-semibold text-amber-300">
              {undoSnap ? `${undoSnap.label}` : "Temiz"}
            </div>
          </div>
        </div>

        {serverMsg && (
          <div className="border border-primary/40 bg-primary/10 p-3 text-xs font-semibold text-primary">
            {serverMsg}
          </div>
        )}

        {gcMsg && (
          <div className="border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
            {gcMsg}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            disabled={isSyncing}
            onClick={handleSyncWithServer}
            className={goldBtn}
          >
            <Cloud className="h-4 w-4" />{" "}
            {isSyncing ? "Senkronize Ediliyor..." : "Buluta Şimdi Senkronize Et (D1 Sync)"}
          </button>

          <button
            type="button"
            disabled={gcRunning}
            onClick={handleRunMediaGc}
            className="inline-flex cursor-pointer items-center justify-center gap-2 border border-border bg-background px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />{" "}
            {gcRunning ? "Medya Temizleniyor..." : "R2 Medya Temizliği (GC)"}
          </button>

          <button
            type="button"
            onClick={() =>
              downloadFile(exportD1SqlDump(), "bycar-cloudflare-d1-dump.sql", "text/sql")
            }
            className="inline-flex cursor-pointer items-center justify-center gap-2 border border-border bg-background px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground transition hover:border-primary hover:text-primary"
          >
            <FileCode2 className="h-4 w-4" /> Cloudflare D1 (.sql) Dökümü İndir
          </button>

          <button
            type="button"
            onClick={() =>
              downloadFile(exportDatabaseJSON(), "bycar-veritabani-yedek.json", "application/json")
            }
            className="inline-flex cursor-pointer items-center justify-center gap-2 border border-border bg-background px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground transition hover:border-primary hover:text-primary"
          >
            <Download className="h-4 w-4" /> JSON Tam Yedek İndir
          </button>

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 border border-border bg-background px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground transition hover:border-primary hover:text-primary">
            <Upload className="h-4 w-4" /> JSON Yedekten Yükle
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  "Tüm tarayıcı önbelleği temizlenecek ve fabrika ayarlarına dönülecektir. Onaylıyor musunuz?",
                )
              ) {
                clearAllBrowserStorage();
                onReset();
                setMsg("Tarayıcı önbelleği ve tüm ayarlar fabrika ayarlarına sıfırlandı.");
                setTimeout(() => setMsg(""), 4000);
              }
            }}
            className="inline-flex cursor-pointer items-center justify-center gap-2 border border-border bg-background px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:border-destructive hover:text-destructive"
          >
            <RotateCcw className="h-4 w-4" /> Önbelleği Temizle & Fabrika Ayarlarına Sıfırla
          </button>
        </div>
      </div>
    </div>
  );
}
