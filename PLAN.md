# ByCar — Exclusive Automotive (`bycarglobal.com`) Master Proje Planı & `/speckit-converge` Denetim Raporu

> **Son Güncelleme:** 13 Ekim 2026
> **Canlı Yerel Sunucu:** `http://localhost:5173/` | **VIP Admin:** `http://localhost:5173/admin` (Şifre: `bycar2024`)

---

## 1. Proje Anayasası ve İş Kuralları (İlk Sohbetten İtibaren Tüm Kararlar)

1. **Marka & Kurucu (`STEP 36`):**
   - Marka: **ByCar — Exclusive Automotive** (`Luxury Without Borders`)
   - Kurucu: **Burak Yılmaz** (`Founder & CEO | BYCAR GLOBAL`)
   - Resmi İletişim: `+90 540 061 16 34` (`905400611634`) | Instagram: [`@bycar.eu`](https://instagram.com/bycar.eu) | Alan Adı: `bycarglobal.com`
2. **Fiyatsız Katalog & Teklif Modeli (`STEP 30, 38`):**
   - Sitede hiçbir araçta sabit fiyat etiketi veya fiyat filtresi yer almaz.
   - Tüm dönüşümler **"Fiyat Teklifi Al (WhatsApp)"**, **"Site Üzerinden Teklif Ver"** ve **"Özel İthalat Talebi"** formları üzerinden yürütülür.
3. **Tasarım & Tipografi Koruma Kuralı (`STEP 90, 102, 111`):**
   - Lovable prototipindeki siyah-altın (`oklch(0.76 0.12 85)`) lüks renk paleti ve `Cormorant Garamond` (başlık) + `Manrope` (gövde) dik font yapısı birebir korunur.
4. **Gerçek Çok Açılı (Multi-Angle) Galeri & Sıralama Kuralı (`STEP 61, 84, 180, 304`):**
   - **1. Sıra:** `@bycar.eu` gerçek galeri aracı **2023 Cupra Formentor 1.5 TSI ACT 150 HP DSG** (4 açı fotoğraf + MP4 Reels videosu + 17 kalem gerçek opsiyon listesi).
   - **2. Sıra:** US CAR `#43346086` **2016 Audi Q2 1.6 TDI Design S-Tronic** (8 açı `1920×1080` fotoğraf + yetkili servis bakım ve ekspertiz detayı).
   - **3–10. Sıra:** Ferrari 296 GTS, Porsche 911 GT3 Weissach, Lamborghini Urus SE, Rolls-Royce Spectre, Mercedes-AMG G 63 Grand Edition, BMW M4 Competition, Audi RS6 Avant Performance ve Bentley Continental GT Speed First Edition (`SATILDI` örneği) — her biri aynı araca ait 6 farklı açı (`1920×1080`) fotoğrafla yerel olarak `public/cars/<id>/` altında barındırılır.
5. **İlk Sohbet Üretim Master Şartnamesi (`STEP 28 & 29` — v3 Final Release):**
   - **Güvenlik & Kimlik Doğrulama:** `PBKDF2-HMAC-SHA256` (`>= 600.000` iterasyon) + 16 bayt rastgele salt, SHA-256 `token_hash` oturum saklama, brute-force rate limiting (15 dk / 5 deneme kilidi) ve CSRF `Origin` kontrolü.
   - **Veri & Görsel Bütünlüğü:** Tarayıcıda Canvas ile otomatik **WebP sıkıştırma** (`1920×1080`), kapak seçimi, görsel sıralama, D1 `CHECK (year >= 1900)` ve uygulama katmanında dinamik üst yıl sınırı (`new Date().getFullYear() + 1`).
   - **SEO & SSR Rotası:** `/arac/:slug` doğrudan erişim rotası (aktif/satılan araçta HTTP 200 + SSR Meta + `Schema.org/Car` JSON-LD, bulunmayan veya `draft` araçta HTTP 404), dinamik `sitemap.xml` (yalnızca `active` araçlar).

---

## 2. Tamamlanan Fazlar (Faz 1 – Faz 5 Özeti)

- [x] **Faz 1:** `.dark` tema düzeltmesi (`styles.css`), 10 gerçek çok açılı araç (60 yerel `1920×1080` fotoğraf + 1 MP4 video, 1. sırada Cupra Formentor, 2. sırada Audi Q2) ve `useByCarStore` senkronizasyonu.
- [x] **Faz 2:** TR/EN dil geçişi, gelişmiş filtre barı, 3 sekmeli `DetailModal`, Kurucu Vizyonu (`Burak Yılmaz` + `/bycar-logo.jpg`), 5 soruluk SSS Accordion, KVKK modalı ve yüzen VIP WhatsApp butonu.
- [x] **Faz 3:** `/admin` şifre ekranı (`bycar2024`), Araç Yönetimi (`Satışta / Satıldı / Taslak`), Yeni Araç Ekle/Düzenle ve Gelen Talepler (CRM Inbox + WhatsApp dönüş).
- [x] **Faz 4 & 5:** `Schema.org/AutoDealer` JSON-LD, `schema.sql`, `vitest` (`3/3 passed`), Cloudflare Worker production build (`npm run build`) ve GitHub push (`e405219`).

---

## 3. `/speckit-converge` — İlk Sohbetten Bugüne Kapsamlı Fark & Eksiklik Analizi (Convergence Findings)

Mevcut kod tabanının (`src/routes/index.tsx`, `src/routes/admin.tsx`, `src/lib/bycar.ts`, `schema.sql`), **İlk Chat Master Şartnamesi (`STEP 28-29`)** ve **Vitrin/Admin İsterleri (`STEP 36, 152, 163`)** ile satır satır karşılaştırılması sonucunda tespit edilen **11 yakınsama bulgusu**:

| ID | Gap Türü | Önem | Kaynak Şartname | Mevcut Koddaki Durum (Kanıt) | Yapılacak İş (Remaining Work) |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **F1** | `contradicts` | **CRITICAL** | `STEP 163` (Admin Video & Düzenleme) | `src/routes/admin.tsx:L431` içinde bir araç düzenlenip kaydedildiğinde `video` alanı formda olmadığı için siliniyor (Cupra Formentor düzenlenirse MP4 videosu kayboluyor). Ayrıca `Vitrinde Öne Çıkar (featured)` ve `Yeni Marka Yazabilme` alanı eksik. | Admin formuna **Video URL**, **Vitrinde Öne Çıkar (`featured`)**, **Özel Marka Girişi** ve fotoğraf **İleri/Geri Sıralama** eklenecek. |
| **F2** | `missing` | **HIGH** | `STEP 29 Madde 4` (WebP Sıkıştırma & Quota Koruması) | `src/routes/admin.tsx:L116-127` içinde `FileReader.readAsDataURL` fotoğrafları ham boyutuyla (örn. 5-10 MB) Base64'e çeviriyor; 2 fotoğraftan sonra `localStorage` 5 MB sınırı dolup çökebilir. Sürükle-bırak (Drag & Drop) alanı da yok. | Tarayıcıda HTML5 Canvas ile **otomatik WebP sıkıştırma (`max 1600px, %82 kalite`)** ve **Sürükle-Bırak (Drag & Drop)** fotoğraf yükleme alanı eklenecek. |
| **F3** | `partial` | **HIGH** | `STEP 28 & 29 Madde 1–2` (PBKDF2 + Rate Limit + Lockout) | `src/routes/admin.tsx:L190` düz metin `pw === "bycar2024"` kontrolü yapıyor ve sınırsız yanlış şifre denemesine izin veriyor. `schema.sql` içinde `iterations` ve `login_attempts` tablosu eksik. | Web Crypto API (`crypto.subtle`) ile **PBKDF2-HMAC-SHA256** doğrulama yardımcısı, **15 dakikada 5 hatalı denemede geçici kilitleme (Brute-Force Lockout)** ve `schema.sql` güvenlik güncellemeleri eklenecek. |
| **F4** | `missing` | **HIGH** | `STEP 28 & 29 Madde 3` (`/arac/:slug` SSR Sayfası & HTTP 404) | Araçlar yalnızca ana sayfadaki modalda açılıyor; doğrudan paylaşılabilir `/arac/$slug` rotası (aktifse HTTP 200 + araca özel OG/Schema.org meta, yoksa veya `draft` ise HTTP 404 görünümü) mevcut değil. | `/arac/$slug` (`src/routes/arac.$slug.tsx`) SEO uyumlu bağımsız araç detay sayfası ve modal içine **"İlan Linkini Kopyala / Paylaş"** özelliği eklenecek. |
| **F5** | `partial` | **HIGH** | `STEP 36 & 46` (Mobil Uyumlu Hamburger Menü) | `src/routes/index.tsx:L169` içinde `<nav className="hidden ... lg:flex">` mobilde menüyü gizliyor ancak mobilde açılır **Hamburger Menü (`Menu` / `X`)** butonu yok. | Header'a mobil ve tablet ekranlar için altın detaylı açılır-kapanır **Mobil VIP Menü** eklenecek. |
| **F6** | `partial` | **MEDIUM** | `STEP 152 Madde 2` (`Audi RS` Filtresi & Sliders İkonu) | Marka barında `"Audi"` var ancak kullanıcı şartnamesinde açıkça `"BMW M"` ve `"Audi RS"` marka filtreleri ile arama kutusu yanında **Filtre İkonu (`SlidersHorizontal`)** ve **Filtreleri Temizle** butonu istendi. | Marka filtrelerinde `"Audi"` ve `"Audi RS"` tam uyumlu hale getirilecek; arama kutusu yanına `SlidersHorizontal` filtre paneli açma/kapama ve aktif filtre sayacı + "Sıfırla" butonu eklenecek. |
| **F7** | `partial` | **MEDIUM** | `STEP 152 Madde 1` ( %100 TR / EN Dil Bütünlüğü) | `index.tsx` içinde kart rozetleri (`FOTOĞRAF`, `VİDEO`, `Benzin`, `Otomatik`), `Yeni Talep Gönder`, `VIP Yönetim Paneli` ve araçların `extras` (Donanım) maddeleri `EN` seçildiğinde Türkçe kalıyor. | Tüm sabit metinler, yakıt/vites/ekspertiz terimleri ve donanım maddeleri (`extrasEn` / otomatik terim çevirisi) `EN` modunda %100 İngilizceye dönecek. |
| **F8** | `partial` | **MEDIUM** | `STEP 28 Madde 2 & 5` (`schema.sql` Kısıtları & Dinamik Yıl) | `schema.sql` içinde `CHECK (year >= 1900)` ve `CHECK (km >= 0)` kısıtları eksik; Admin formunda dinamik üst yıl (`new Date().getFullYear() + 1`) doğrulaması yok. | `schema.sql` ve Admin form doğrulaması `1900 <= year <= currentYear + 1` ve `km >= 0` kurallarına göre güncellenecek. |
| **F9** | `partial` | **MEDIUM** | `STEP 29 Madde 3` (Sitemap & Sadece `active` Araçlar) | `public/sitemap.xml` içinde yalnızca ana sayfa URL'si var; koleksiyondaki `active` araçların `/arac/<id>` bağlantıları yer almıyor (`sold` ve `draft` hariç). | `public/sitemap.xml` tüm `active` araçların `/arac/<id>` rotalarını içerecek şekilde güncellenecek (`draft` ve `sold` hariç). |
| **F10** | `missing` | **LOW** | `STEP 36 Madde 6` (Çerez Yönetimi Banner'ı) | KVKK ve Gizlilik modalı mevcut ancak ilk ziyarette alt barda çıkan **Çerez (Cookie) Tercih & Onay Banner'ı** eksik. | `localStorage` hafızalı, siyah-altın tasarımlı **VIP Çerez Aydınlatma & Kabul Banner'ı** eklenecek. |
| **F11** | `missing` | **LOW** | `STEP 152 Madde 3` (Klavye Ok Tuşları ile Galeri Geçişi) | `DetailModal` içinde fare ile sağ/sol oklar çalışıyor ancak klavyeden `ArrowLeft` / `ArrowRight` / `Escape` tuşlarıyla hızlı galeri geçişi bağlı değil. | `DetailModal` içine klavye yön tuşları (`←`, `→`, `Esc`) desteği eklenecek. |

---

## 4. Faz 6: Convergence & Kullanıcı Kararları (Onaylanan 4 Mimari Karar)

Soru-Cevap oturumunda netleşen 4 temel karar:

1. **Karar 1 — Hibrit Filtreleme & Admin'den Yönetilebilir Vitrin/Modal Ayarları:**
   - Ana lüks markalar (`Cupra`, `Audi`, `Audi RS`, `Ferrari`, `Porsche`, `Lamborghini`, `Rolls-Royce`, `Mercedes-AMG`, `BMW M`, `Bentley`) sabit durur; yeni eklenen farklı bir marka olursa otomatik olarak filtre barına eklenir.
   - Admin paneline **"4. Vitrin, Filtre & Modal Ayarları"** sekmesi eklenerek; hangi filtrelerin (`Model Yılı`, `Kasa Tipi`, `Yakıt`, `Vites`, `Durum`) ve **3 Sekmeli Detay Modalı** özelliklerinin (`Teknik & Ekspertiz`, `Donanım & Opsiyonlar`, `Site Üzerinden Teklif Ver`) aktif olacağı Admin'den tek tıkla yönetilir.
2. **Karar 2 — "Talebi VIP Danışmana İlet" Çift Kanal Akışı (Admin Inbox + Anında WhatsApp):**
   - Müşteri siteden "Site Üzerinden Teklif Ver" veya "Özel İthalat Talebi" gönderdiğinde:
     1. Talep önce **Admin Panelindeki "3. Gelen Talepler (Inbox)"** sekmesine kaydedilir.
     2. Aynı anda müşterinin girdiği tüm bilgilerle (`Ad Soyad`, `Telefon`, `Araç/Model`, `Teklif/Bütçe`) hazır doldurulmuş **WhatsApp mesajı (`+90 540 061 16 34`) otomatik olarak yeni sekmede açılır** (ve ekranda tek tıkla tekrar gönderme butonu gösterilir).
3. **Karar 3 — Admin "Yeni Araç Ekle" Pratikliği (Tıklanabilir Hazır Etiketler / Chips + Üstte TR/EN Seçimi + Otomatik Çeviri):**
   - Admin panelinin en üst barına **TR / EN dil seçimi** eklenir (vitrin diliyle senkronize çalışır, yanlışlıkla İngilizce kalmasını önler).
   - Araç eklerken `Marka`, `Donanım Paketi`, `Motor Gücü`, `Dış/İç Renk`, `Ekspertiz Durumu`, `Tramer` ve **25+ popüler `Donanım & Opsiyon` maddesi** tek tıkla seçilebilir hazır etiketler (**Chips**) olarak sunulur; istenirse elle de yeni özellik yazılabilir.
   - İngilizce açıklama ve donanımlar, Türkçe verilerden **otomatik oluşturulur/çevrilir** (elle tekrar İngilizce yazma zorunluluğu kaldırılır).
4. **Karar 4 — Kartlarda Akıllı Tam Sığdırma (`Cupra` Plaka/Tavan Kesilmeme) + Bulanık Lüks Arka Plan:**
   - Dikey veya yakın çekim fotoğraflarda (örn. `Cupra Formentor`) fotoğraf kırpılmadan (`object-contain`) kartın içine tam sığdırılır; kenar boşlukları aynı fotoğrafın koyu-bulanık lüks stüdyo yansımasıyla (`blur-xl brightness-50`) doldurulur.
   - Admin panelinde her araç için **"Kart Kadrajı: Tam Sığdır (Kesmeden) / Tam Doldur"** seçimi bulunur.

---

## 5. ✅ Faz 6 Görev Listesi (`T001` – `T010`) — TAMAMLANDI (%100 Yakınsama)

- [x] **T001 (`CRITICAL`):** Admin "Yeni Araç Ekle / Düzenle" formunu **Tıklanabilir Hazır Etiketler (Chips) + Serbest Yazma**, **Otomatik İngilizce Çeviri**, **Video URL**, **Vitrinde Öne Çıkar (`featured`)** ve **Fotoğraf Sıralama** ile yenile.
- [x] **T002 (`CRITICAL`):** Araç kartlarında **Akıllı Tam Sığdırma + Bulanık Lüks Arka Plan (`imageFit: "contain" | "cover"`)** yapısını kur (Cupra'nın `16 BBU 350` plakası ve tavanı hiç kesilmeden tam görünsün) ve Admin'e kadraj seçimi ekle.
- [x] **T003 (`HIGH`):** **"Talebi VIP Danışmana İlet"** formlarını **Çift Kanal** yap (hem Admin Inbox'a kaydet hem de otomatik olarak `+90 540 061 16 34` WhatsApp mesajını hazır metinle aç).
- [x] **T004 (`HIGH`):** Admin paneline üst **TR / EN Dil Seçimi** ve **"4. Vitrin, Filtre & Modal Ayarları"** sekmesini ekle; hibrit marka filtreleme mantığını devreye al.
- [x] **T005 (`HIGH`):** Admin fotoğraf yükleme alanına **Sürükle-Bırak (Drag & Drop)** ve HTML5 Canvas ile **otomatik WebP sıkıştırma (`max 1600px, 0.82 kalite`)** ekle.
- [x] **T006 (`HIGH`):** Admin girişine Web Crypto API (`PBKDF2-HMAC-SHA256`) doğrulama altyapısı ve **15 dakikada 5 hatalı girişte geçici kilitleme (Brute-Force Rate Limit)** ekle.
- [x] **T007 (`HIGH`):** `/arac/$slug` bağımsız araç detay & 404 sayfasını (`src/routes/arac.$slug.tsx`) ve `DetailModal` içine **"İlan Linkini Paylaş / Kopyala"** butonunu ekle.
- [x] **T008 (`HIGH`):** Header'a mobil/tablet için **VIP Hamburger Menü**, koleksiyon arama yanına `SlidersHorizontal` filtre paneli ikonu + **"Filtreleri Temizle"** butonu ekle.
- [x] **T009 (`MEDIUM`):** `EN` dil modunda kalan tüm rozet (`FOTOĞRAF`, `VİDEO`), yakıt/vites/kasa ve donanım maddelerini %100 İngilizceye çevir; `schema.sql` ve `sitemap.xml` dosyalarını güncelle.
- [x] **T010 (`LOW`):** Alt kısımda **VIP Çerez (Cookie) Onay Banner'ı**, `DetailModal` klavye yön tuşları (`←`, `→`, `Esc`) ve `vitest` test doğrulamasını tamamla (`✓ 3/3 passed`).

---

## 6. ✅ Faz 7: Tam Tarama (`/debugger` & `/browser`), Sınırsız Yazılabilir Alanlar & Veritabanı Yedekleme Merkezi

- [x] **T011 (Fotoğraf Sürükle-Sırala & Canlı Vitrin/Galeri Önizlemesi):** Fotoğraf küçük resimlerini sürüklerken oluşan çoğalma (duplication) hatası giderildi (`e.stopPropagation()` + `dataTransfer.types.includes("Files")` kontrolü). Sürüklerken anlık canlı vitrin önizlemesi (`previewImages`) eklendi.
- [x] **T012 ("Düzenlemeyi Sıfırla" / "Formu Sıfırla" Butonu & Sekme Koruması):** Araç düzenlerken veya yeni araç eklerken hem formun üst barına hem de alt "Kaydet" butonunun yanına **"Düzenlemeyi Sıfırla"** (`resetCurrentEdit`) ve **"Yeni Araç Formuna Geç"** butonları eklendi. Sekmeler arası geçişte (`Araç Yönetimi` ↔ `Araç Düzenle`) form verilerinin silinmesi engellendi; kayıt sonrasında düzenlenen araç ekranda korunur hale getirildi.
- [x] **T013 (Hiçbir Sınırlama Olmadan Tıklanabilir + Yazılabilir Kasa Tipi, Yakıt, Vites, Yıl, KM):**
  - **Kasa Tipi (`body`)**, **Yakıt Türü (`fuel`)** ve **Vites Tipi (`gear`)** alanları sabit `<select>` olmaktan çıkarılıp hem **11+ hazır tıklanabilir etiket (`Coupe`, `SUV`, `Sedan`, `Cabrio`, `Hatchback`, `Station Wagon / Avant`, `Crossover`, `Roadster`, `Shooting Brake`, `VIP Minivan`, `Pick-up` vb.)** hem de **serbest yazılabilir `<input />`** yapıldı.
  - `Model Yılı` ve `Kilometre` alanlarındaki üst/alt sınır kısıtlamaları kaldırıldı.
  - Ana sayfadaki gelişmiş filtre panelinde `Kasa Tipi`, `Yakıt` ve `Vites` listeleri **Hibrit Dinamik** yapıldı (Admin'de elle yazılan her yeni kasa/yakıt/vites tipi otomatik olarak ana sayfa filtrelerinde görünür).
  - `schema.sql` içerisindeki sabit `CHECK (body IN (...))` kısıtları kaldırılarak Cloudflare D1 / SQLite veritabanında sınırsız özel kasa/yakıt/vites tiplerinin hatasız kaydedilmesi sağlandı.
- [x] **T014 (`/debugger` & `/browser` Hata Ayıklama + Veritabanı / Veri Kaybı Koruma Merkezi):**
  - `/admin` rotasında `sessionStorage` kaynaklı SSR Hydration uyuşmazlığı giderildi.
  - Hızlı marka etiketlerine üst üste tıklanması durumunda model başlığının otomatik güncellenmesi düzeltildi.
  - Detay modalında varsayılan sekme Admin'den kapatıldığında otomatik olarak ilk aktif sekmeye (`specs` -> `extras` -> `offer`) düşmesi sağlandı.
  - **Otomatik Geri Alma (`Son İşlemi Geri Al` / Undo Snapshot)**, **JSON Tam Yedek İndir / Geri Yükle** ve **Cloudflare D1 SQLite (`.sql`) Veritabanı Dışa Aktarma (`exportD1SqlDump`)** özellikleri eklendi.

