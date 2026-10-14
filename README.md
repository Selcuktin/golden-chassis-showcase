# ByCar — Exclusive Automotive Showcase

> Lüks, süper spor ve özel ithalat araçlar için fiyatsız (teklif usulü) VIP vitrin, SSR destekli katalog ve Cloudflare D1 destekli yönetim platformu.

---

## 🌐 Canlı Yayın & Domain Bilgileri

- **Aktif Cloudflare Worker URL:**  
  [https://selcuktin-golden-chassis-showcase.selcuktin.workers.dev](https://selcuktin-golden-chassis-showcase.selcuktin.workers.dev)
- **Hedef Özel Alan Adı (Custom Domain):**  
  `https://bycarglobal.com` (ve `https://www.bycarglobal.com`)
- **VIP Yönetim Paneli:**  
  `/admin` (PBKDF2-HMAC-SHA256 100.000 iterasyon ve IP brute-force korumalı)

---

## 🛠️ Mimari & Teknolojiler

- **Frontend & SSR Framework:** [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router)
- **Sunucu & Kenar Altyapısı (Edge):** Cloudflare Workers (Nitro SSR adaptörü ile)
- **Veritabanı:** Cloudflare D1 (SQLite) — `bycar_db` (`cb9bbc34-a9ef-446e-b993-46405a7ca765`)
- **Stil & Arayüz:** Tailwind CSS v4, Lucide Icons, Cormorant Garamond & Manrope tipografi
- **Test & Kalite:** Vitest, TypeScript (Strict: `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`), ESLint + Prettier

---

## 🛡️ Güvenlik ve Veri Koruma

1. **Sunucu Tarafı API Yetkilendirmesi:**  
   `POST /api/cms`, `GET /api/admin/inquiries` ve `POST /api/admin/inquiries/status` endpoint'leri kriptografik Bearer session token ile korunmaktadır.
2. **KVKK Veri İzolasyonu:**  
   Müşteri ad-soyad, telefon ve teklif bilgileri genel katalog sorgusundan (`GET /api/cms`) tamamen izole edilmiştir; sadece yetkili yönetici oturumuyla erişilebilir.
3. **Mevcut parola doğrulaması:**
   Yönetici girişi mevcut 100.000 iterasyonlu Web Crypto PBKDF2-HMAC-SHA256 ve D1 kalıcı Brute-Force kilidi (5 hatalı denemede 15 dakika kilit) ile korunur. Sahip kararıyla `CF_ACCESS_REQUIRED=false`; e-posta/OTP girişi kullanılmaz. Panelin açılması özel API'lere erişim vermez: geçerli D1 oturumu gerekir.
4. **Talep & CSRF Sınırları:**  
   Teklif formu (`POST /api/inquiry`) IP başına 10 dakikada en fazla 5 istekle sınırlandırılmış olup, gövde boyutları ve girdi temizliği sunucu tarafında doğrulanır.
5. **SEO & Gerçek HTTP 404:**  
   Var olmayan araç linklerinde veya taslak araçlarda soft-404 yerine gerçek HTTP 404 döndürülür. Dinamik XML sitemap (`/sitemap.xml`) yalnızca aktif araçları listeler.

---

## 🚀 Cloudflare Custom Domain (bycarglobal.com) Bağlama Rehberi

Alan adı, DNS/TLS ve `SITE_URL` ayarı birlikte hazırlanmalıdır. Ana alan adı ve
`www` aynı Worker üzerinde çalışmadan `SITE_URL` etkinleştirilmemelidir.
Adım adım geçiş ve son kontrol komutları için
[yayın hazırlığı raporunu](docs/production-readiness.md#alan-adı-alındığında) okuyun.

Satın alınmış alan adı veya e-posta kutusu bu repoda varsayılmaz. `SITE_URL`
verilmediğinde çalışan adresin origin'i kullanılır; verildiğinde alternatif
adresler yöntem/gövde koruyan 308 ile ana adrese yönlendirilir.

---

## 💻 Yerel Geliştirme & Komutlar

```bash
# Kilitlenmiş bağımlılıkları yükle (Node.js 24)
npm ci

# Geliştirme sunucusunu başlat (http://localhost:5173)
npm run dev

# TypeScript tip denetimi (0 hata)
npm run typecheck

# Kod stili & Lint denetimi (0 hata)
npm run lint

# Otomatik kod formatlama
npm run format

# Birim & Entegrasyon testleri
npm test

# Gerçek yerel D1/R2 bağlamaları (Wrangler/workerd; üretime erişmez)
npm run test:integration

# Production SSR derlemesi
npm run build

# Cloudflare Workers'a deploy et
npx wrangler deploy --config .output/server/wrangler.json
```

---

## 📁 D1 Veritabanı Yönetimi

Şemanın TypeScript kaynağı `src/server/db/schema.ts`, uygulanacak SQL geçmişi
`drizzle/` dizinindedir. API istekleri tablo oluşturmaz veya şema onarımı yapmaz.

```bash
# Şema değişikliğinden sonra SQL ve snapshot üret:
npm run db:generate -- --name=degisiklik_adi

# Yerel veritabanına sıralı migration uygula:
npm run db:migrate:local

# İncelenmiş üretim geçişinde, uygulama deploy'undan ÖNCE:
npm run db:migrate:remote
```

İlk kurulum ve mevcut verilerin korunarak devralınması için
[D1 geçiş rehberini](docs/database-migrations.md), kalan mimari çalışma sırası için
[mimari inceleme notunu](docs/architecture-review.md) okuyun. CI; tip denetimi,
şema/snapshot tutarlılığı, lint, Vitest, D1/R2 entegrasyonu, build ve npm audit çalıştırır.

İsteğe bağlı Cloudflare Access'in yeniden etkinleştirme ayarları ve mevcut giriş düzeni
[Access rehberinde](docs/cloudflare-access.md) açıklanmıştır.

Ayrıntılı son sistem denetimi, düzeltilen akışlar ve işletim sınırları:
[docs/production-readiness.md](docs/production-readiness.md).
