# D1 tüketim incelemesi — 18 Ekim 2026

Üretime deploy veya migration uygulanmadı. Hesap/DNS taşıması yapılmadı;
taşıma planı ayrı branch ve PR #21'de korunuyor.

## Ölçülen hesap tüketimi

Cloudflare GraphQL `d1AnalyticsAdaptiveGroups`, UTC tarih grupları; 18 Ekim
Türkiye saatiyle yaklaşık 12.02'de alındı. Sorgu sayısı faturalama metriği değildir.

| UTC gün                    | Veritabanı      | Okunan satır | Yazılan satır | Okuma sorgusu |
| -------------------------- | --------------- | -----------: | ------------: | ------------: |
| 17 Ekim                    | inegol-cozum-db |    4.157.940 |           433 |         2.746 |
| 17 Ekim                    | bycar_db        |       91.125 |             5 |         1.795 |
| 17 Ekim                    | sami-app-db     |          532 |             0 |           456 |
| 18 Ekim, ölçüm anına kadar | bycar_db        |       41.925 |             0 |           816 |

18 Ekim için diğer iki DB adına henüz grup dönmedi; bu, bütün gün sıfır
kullanım garantisi değildir. Günlük kota yenilenmiş; 17 Ekim toplamı 4.249.597.
Ham ölçüm ana checkout'un ignore edilmiş `.wrangler/d1-optimization-metrics-20261018.json`
dosyasında saklandı. Üretim SQL yük testi yapılmadı.

## ByCar nedeni ve değişiklik

Araç detayının loader'ı, tek aracı okuduktan sonra yalnız site ayarları için
`getLiveCmsData` çağırarak bütün araçları ve görselleri tekrar okuyordu.
`getLiveSiteData` güncel ayarları ayrı okur; detay sorguları beşten üçe iner.
CMS ana sayfası aynı ayar ayrıştırma ve hassas alan temizleme kodunu paylaşır.

Public store, SSR loader'ının sağladığı `cars` listesi varken hydration sırasında
`/api/cms` istemez. Boş SSR listesi de geçerlidir; eski admin/browser kayıtlarıyla
yer değiştirmez. SSR verisi yoksa ilk okuma devam eder. Adminin yetkili taze
okuması, kaydetme/revision akışı ve oturum kontrolleri korunur.

Yeni kalıcı/edge cache, TTL veya auth değişikliği yok; ayarlar loader çalıştığında
D1'den okunur. Açık sayfaya sürekli canlı güncelleme eklenmez.

## Kanıt ve sınırlar

- Gerçek yerel Wrangler/workerd D1: 20 araç + 20 görsellik sentetik fixture'da
  detay loader'ının eski yolu **5 sorgu / 87 satır**, yeni yolu **3 sorgu / 5 satır**.
  Araç/ayar sonuçları aynı; hemen sonraki ayar değişikliği yeni okumada görünür.
- Hook testleri: SSR varsa ek HTTP okuması yok, SSR yoksa bir okuma, admin
  okumaları Authorization ile devam eder; paylaşılan özel cache kullanılmaz.
- Yerel kalite: typecheck, ESLint, Vitest, 28 gerçek D1/R2 testi, build,
  Drizzle snapshot ve npm audit (0 açık) kontrol edildi. Son test sayısı PR'da.
- Bu fixture sonucu canlı günlük tüketim tasarrufu oranı değildir. Canlı önce/sonra
  ölçümü ancak onaylı deploy sonrasında benzer trafik pencerelerinde yapılabilir.

## Yayın ve geri dönüş

Şema/veri migration'ı gerekmez. CI ve PR incelemesinden sonra onaylanan commit
build edilir; üretilen config'in mevcut hesap/D1/R2/domaini koruduğu doğrulanır.
Yayın sonrası salt okunur `npm run check:site -- https://bycaretiler.com`,
normal sahip panel girişi ve D1 metrikleri izlenir.
Sorun halinde önceki Worker sürümü yeniden yayınlanır; DB/R2 geri yüklenmez.

Kaynak: [Cloudflare D1 metrik tanımları](https://developers.cloudflare.com/d1/observability/metrics-analytics/).
