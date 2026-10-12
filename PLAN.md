# ByCar — Exclusive Automotive (`bycarglobal.com`) Master Proje Planı & İlerleme Takibi

> **Son Güncelleme:** 13 Ekim 2026
> **Canlı Yerel Sunucu:** `http://localhost:5173/` | **VIP Admin:** `http://localhost:5173/admin` (Şifre: `bycar2024`)

---

## 1. Proje Anayasası ve İş Kuralları (Sohbet Geçmişinden Özütlenen Kararlar)

1. **Marka & Kurucu:**
   - Marka: **ByCar — Exclusive Automotive** (`Luxury Without Borders`)
   - Kurucu: **Burak Yılmaz** (`Founder & CEO | BYCAR GLOBAL`)
   - Resmi İletişim: `+90 540 061 16 34` (`905400611634`) | Instagram: [`@bycar.eu`](https://instagram.com/bycar.eu) | Alan Adı: `bycarglobal.com`
2. **Fiyatsız Katalog & Teklif Modeli:**
   - Sitede hiçbir araçta sabit fiyat etiketi veya fiyat filtresi yer almaz.
   - Tüm dönüşümler **"Fiyat Teklifi Al (WhatsApp)"**, **"Site Üzerinden Teklif Ver"** ve **"Özel İthalat Talebi"** formları üzerinden yürütülür.
3. **Tasarım & Tipografi Koruma Kuralı:**
   - Lovable prototipindeki siyah-altın (`oklch(0.76 0.12 85)`) lüks renk paleti ve `Cormorant Garamond` (başlık) + `Manrope` (gövde) dik font yapısı birebir korunur.
4. **Gerçek Çok Açılı (Multi-Angle) Galeri Kuralı:**
   - Her aracın detay galerisinde farklı araçların karışık fotoğrafları yerine, **aynı araca ait 4 ila 8 farklı açıdan (`1920×1080`) fotoğraf** (Ön Çapraz, Arka Çapraz, Yan Profil, İç Kokpit, Koltuk/Detay) yerel olarak `public/cars/<arac-id>/` altında barındırılır.
   - `@bycar.eu` Instagram hesabındaki **1. gerçek araç (2023 Cupra Formentor 1.5 TSI ACT 150 HP DSG)** 4 fotoğrafı, MP4 Reels videosu ve 17 maddelik tam ekstra listesiyle **1. sırada** yer alır (2. post olan Can-Am Maverick X3 kullanıcı kararıyla hariç tutulmuştur).

---

## 2. Faz Bazlı İlerleme Durumu (Roadmap Checklist)

### ✅ Faz 1: Kritik Temel, Tema Düzeltmesi & Çok Açılı Yerel Görsel Envanteri (TAMAMLANDI)
- [x] **`C1` Siyah-Altın Tema Düzeltmesi:** `src/styles.css` içindeki `.dark` sınıfının `:root` altın (`--primary`) renklerini ezmesi giderildi.
- [x] **`C2` 10 Gerçek Çok Açılı Araç & Yerel Görsel Yedekleme (`public/cars/`):**
  1. `cupra-formentor-2023` — **2023 Cupra Formentor 1.5 TSI ACT 150 HP DSG** (`@bycar.eu` gerçek post: 4 açı fotoğraf + `video.mp4` + 17 ekstra)
  2. `audi-q2-design-2016` — **2016 Audi Q2 1.6 TDI Design S-Tronic** (US CAR `#43346086`: 8 açı `1920×1080` yerel fotoğraf + yetkili servis bakım/ekspertiz detayı)
  3. `ferrari-296-gts` — **2025 Ferrari 296 GTS 3.0 V6 Assetto Carbon** (6 açı `1920×1080` yerel fotoğraf)
  4. `porsche-911-gt3-weissach` — **2025 Porsche 911 GT3 (992.2) Weissach Package** (6 açı `1920×1080` yerel fotoğraf)
  5. `lamborghini-urus-se` — **2026 Lamborghini Urus SE 4.0 V8 800 HP** (6 açı `1920×1080` yerel fotoğraf)
  6. `rolls-royce-spectre` — **2024 Rolls-Royce Spectre Coupe Bespoke Starlight** (6 açı `1920×1080` yerel fotoğraf)
  7. `mercedes-g63-grand-edition` — **2024 Mercedes-AMG G 63 Grand Edition (1 of 1000)** (6 açı `1920×1080` yerel fotoğraf)
  8. `bmw-m4-competition-2025` — **2025 BMW M4 Competition Coupe M xDrive** (6 açı `1920×1080` yerel fotoğraf)
  9. `audi-rs6-performance` — **2024 Audi RS6 Avant Performance Quattro 630 HP** (6 açı `1920×1080` yerel fotoğraf)
  10. `bentley-gt-speed-first-edition` — **2024 Bentley Continental GT Speed First Edition** (6 açı `1920×1080` yerel fotoğraf — **SATILDI** örneği)
- [x] **`C3` Reaktif Veri Katmanı:** `src/lib/bycar.ts` içinde `localStorage` + `CustomEvent` senkronizasyonu (`useByCarStore`) kuruldu.

### ✅ Faz 2: Zengin Vitrin Deneyimi, Çoklu Dil (TR/EN) & Kurumsal Bölümler (TAMAMLANDI)
- [x] **Gerçek Çalışan TR / EN Dil Geçişi:** Menü, butonlar, filtreler, süreç adımları, Kurucu Vizyonu, SSS ve KVKK metinleri anında dil değiştirir.
- [x] **Gelişmiş Filtreleme & Durum Seçimi:** Marka barı (`Cupra`, `Ferrari`, `Porsche`, `Lamborghini`, `Rolls-Royce`, `Mercedes-AMG`, `BMW M`, `Audi`, `Bentley`), Arama, Model Yılı, Kasa Tipi, Yakıt, Vites ve **Durum (`Tüm Araçlar / Satışta Olanlar / Satılanlar`)** filtresi eklendi.
- [x] **Zenginleştirilmiş Araç Detay Modalı (`DetailModal`):**
  - İleri/Geri oklarıyla çok açılı fotoğraf geçişi ve açı sayacı (`Açı 1 / 6`).
  - **VİDEO** butonuyla gömülü MP4 Reels video oynatıcı.
  - 3 Sekmeli Detay: `Teknik & Ekspertiz`, `Donanım & Opsiyonlar` ve `Site Üzerinden Teklif Ver`.
- [x] **Kurucumuzun Vizyonu (`#kurucu`):** Seçilen tam vizyon metni (TR/EN) ve resmi `BYCAR.EU` altın logolu görsel (`/bycar-logo.jpg`) eklendi.
- [x] **5 Soruluk SSS (Accordion) & KVKK Modalı:** `#sss` bölümü ve Footer'da tıklanabilir yasal aydınlatma modalı eklendi.
- [x] **Sabit Yüzen (Floating) VIP WhatsApp Butonu:** Sağ alt köşeye canlı durum ışıklı hızlı iletişim butonu eklendi.

### ✅ Faz 3: Kapsamlı VIP Yönetim Paneli (`/admin`) (TAMAMLANDI)
- [x] **Yönetici Şifre Kapısı:** `bycar2024` şifre korumalı VIP giriş ekranı.
- [x] **Sekme 1 — Araç Yönetimi:** Tüm araçları listeleme, tek tıkla `Satışta / Satıldı / Taslak` durumuna alma, düzenleme, silme ve varsayılana sıfırlama.
- [x] **Sekme 2 — Yeni Araç Ekle & Düzenle:** Çoklu fotoğraf yükleme (dosya + URL), kapak fotoğrafı seçme, TR/EN açıklama ve satır satır donanım girişi.
- [x] **Sekme 3 — Gelen Talepler (CRM Inbox):** Vitrin formlarından gelen gerçek Teklif ve Özel İthalat taleplerini görüntüleme, durum takibi (`Yeni / İletişime Geçildi / Tamamlandı`) ve tek tıkla **"WhatsApp'tan Dönüş Yap"** butonu.

### ✅ Faz 4: SEO, Veritabanı Şeması & Otomatik Test Doğrulaması (TAMAMLANDI)
- [x] **SEO Yapısal Veri (`Schema.org/AutoDealer` & `Car`):** `QuantitativeValue` (`KMT`) kilometre bilgisi ve stok durumu (`InStock` / `SoldOut`) içeren dinamik JSON-LD eklendi.
- [x] **`public/sitemap.xml` & `public/robots.txt`:** Arama motoru indeksleme kuralları (`/admin` disallow dahil) yapılandırıldı.
- [x] **Cloudflare D1 SQLite Şeması (`schema.sql`):** Canlı veritabanı tabloları (`vehicles`, `vehicle_images`, `inquiries`, `admin_users`, `admin_sessions`, `site_settings`) hazırlandı.
- [x] **Birim Testleri (`src/test/app-routing.test.tsx`):** Rota eşleşmesi, 10 aracın çok açılı benzersiz fotoğraf kontrolü (1. sırada Cupra Formentor, 2. sırada Audi Q2), fiyatsız yapı kuralı ve TR/EN çeviri bütünlüğü testleri yazıldı (`✓ 3/3 passed`).

---

## 3. Faz 5 — Production Build, GitHub Push & Canlıya Çıkış (TAMAMLANDI)
- [x] Production SSR + Client + Cloudflare Worker (`cloudflare-module`) derlemesi (`npm run build`) sıfır hatayla doğrulandı.
- [x] Değişiklikler GitHub reposuna (`Selcuktin/golden-chassis-showcase`) commit & push edildi.
- [ ] **Opsiyonel Son Adım:** `bycarglobal.com` alan adının Cloudflare Workers (`npx wrangler deploy`) veya Lovable/Vercel üzerinden canlıya bağlanması.
