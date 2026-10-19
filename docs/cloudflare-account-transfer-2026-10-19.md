# ByCar hesap aktarımı — 19 Ekim 2026 operasyon kaydı

Hazırlık ve güvenli restore PR #21 ile main'e alındı (06d4bfb).
Bu PR yeni hesap yayın hedefini kalıcı Wrangler yapılandırmasına geçirir.
Domain ve uygulama URL'leri değişmedi. **Tam aktarım 19 Ekim 2026'da tamamlandı.**
PR #23 merge SHA'sı `1fb6a8b5aba2680f959872e690acccd0f6502369` yeni hesapta
yayınlandı; sahibi mevcut parolasıyla girişini ve araçları doğruladı.

## Hedef kaynaklar

- Hesap: `7f748d43de71933045facda4f76e8d2d` (atackonben).
- Worker: `bycaretiler`; workers.dev ve sürüm preview URL'leri kapalı.
- D1: `bycar_db`, `8b964994-5695-49da-9923-64ca43dfa8cf`.
- R2: `bycar-media`, özel erişim; public bucket açılmadı.
- Zone: `a6efd36482258371c763caf785dc48b3`.
- Nameserver: `aaden.ns.cloudflare.com`, `adi.ns.cloudflare.com`.
- DNS: proxied A @ → 192.0.2.1, proxied CNAME www → bycaretiler.com,
  mevcut Google Search Console TXT doğrulaması korunuyor.

Eski Cloudflare IP'leri otomatik taramadan kopyalanmadı. Apex ve www yeni Worker'a
route ile bağlandı; 192.0.2.1 gerçek origin değil. Pending zone'da Custom Domain
aktivasyonu beklemek yerine iki route önceden kuruldu. Kalıcı config bu iki
route'u korur; ayrı origin veya eski hesaba Worker service binding kullanılmaz.

## Tamamlanan veri kontrolleri

Eski hesapta yazma kilidi etkinleştirilip beş migration ile kurulmuş boş hedefe
son veri snapshot'ı aktarıldı. Aynı veriyi dolu hedefe yeniden import etmeyin.
SQL yedekleri ve hash manifestleri Git dışındaki `.wrangler/transfer/backups/`
dizininde, özel Windows ACL ile saklanır. Git'e parola, token, müşteri verisi eklenmedi.

- Dokuz tablonun PK sıralı içerik hash'leri kaynak/hedefte birebir aynı.
- 13 araç (taslaklar dahil), 84 görsel kaydı; parola/oturum kayıtları aynı.
- D1 quick_check: ok; foreign_key_check: 0 ihlal; 5 migration, 2 trigger.
- Üç R2 nesnesi, toplam 3.990.237 byte: SHA-256 ve HTTP metadata birebir aynı.
  Aktarım için OAuth'un Wrangler ile aynı object API'si kullanıldı. İçerik veya
  görsel formatı değiştirilmedi; custom metadata olmadığı doğrulandı.
- Görsel tablosundaki 84 referansın statik dosyaları hedef Worker assets'te mevcut.
- İkinci kaynak export'u, aktarım boyunca kaynak içeriklerinin değişmediğini doğruladı.
- Hedefteki gerçek uzak D1/R2 binding'lerine bağlı loopback-only Wrangler önizlemesinde
  76 salt okunur kabul kontrolü geçti: 9 halka açık araç, 58 medya, özel API 401,
  canonical/robots/sitemap, SSR sayfalar ve güvenlik başlıkları.
  Bu önizleme SITE_URL için bycaretiler.com'u kullanır; eski siteye redirect etmez.

## Parola ve erişim

Paneldeki mevcut parola D1 hash/salt/iterations satırıyla aynen taşındı.
Eski Worker'ın ADMIN_PASSWORD secret'ı Cloudflare'dan geriye okunamaz; sahibi
değerini bilmediğini bildirdi. Bu ayrı env fallback yeni hesapta kurulmadı;
normal panel parolası DB'den doğrulanmaya devam eder. Yeni parola veya kimlik
doğrulama kodu üretilmedi. CF_ACCESS_REQUIRED=false; e-posta/OTP geri açılmadı.

## Son kabul kapıları

- [x] Hazırlık PR #21 CI quality/audit başarılı; 165 Vitest, 30 gerçek yerel D1/R2.
- [x] Hedef migration, veri/hash ve medya karşılaştırması, özel önizleme kabulü.
- [x] Yeni hesaptaki DNS kayıtları sahip ekran görüntüsüyle doğrulandı.
- [x] Geçiş öncesi public resolver'da DS cevabı yok (DNSSEC delegasyonu kapalı).
- [x] Sahip Turkticaret nameserver değişikliğini kaydetti; registry ve iki public
  resolver yeni NS'leri doğruladı.
- [x] Yeni zone Active (17:16:29 UTC); eski zone Moved Away. Apex HTTPS ve www
  HTTPS yönlendirmesi geçerli sertifikayla doğrulandı; path/query korunuyor.
- [x] Kalıcı yeni hesap config PR #23 tüm CI kontrolleri sonrası merge edildi;
  merge SHA'sı yayınlandı. Main quality ve audit de başarılı.
- [x] Yalnız yeni hedefte yazmalar açık; sahip mevcut panel parolasıyla giriş yaptı.
- [x] Eski Worker D1/R2/service/assets bindings: 0; route: 0; custom domain: 0;
  workers.dev ve preview URL'leri kapalı. Eski workers.dev adresi 404 ve Location
  başlığı yok: eski hesaptan yeni hesaba yönlendirme veya proxy yapılmıyor.
- [x] Yeni site kalıcı hedef config ile doğrudan yeni hesapta çalışıyor;
  runtime kaynaklarında eski Worker/hesap/D1 referansı yok. Eski hesaptaki diğer
  projelere dokunulmadı.

Yayın sonrası salt okunur canlı kabul tekrarlandı: 76 kontrol, 9 halka açık araç,
58 medya, 0 hata. Taslaklar dahil 13 araç ve 84 görsel satırı tam veri kopyasında
korunur; kamu kataloğunun daha küçük olması veri kaybı değildir. Normal parola
girişi sahibi tarafından yapıldı; üretimde sentetik müşteri/araç testi yapılmadı.
Yeni D1 Time Travel kurtarma noktası özel operasyon kaydına alındı. Son giriş
sonrası yeni hedefin ayrıca SQL yedeği alınır. R2 kaynak nesneleri ve son hash
manifesti özel operasyon dizinindedir. Gelecekteki değişiklikler için bağımsız
periyodik R2 yedeği ayrıca planlanmalıdır; sürekli yedek otomasyonu kurulmuş
gibi raporlanmaz. Yayın sonrası trafik bazlı günlük D1 tasarrufu henüz ölçülmedi.

Kilitli hedef sürüm 087eb0b4-7eae-487f-a2a0-c4c9d934239c; yazma açılan
yayın 34bfbd17-61f3-4297-bd33-ff4fe1b3c78a. Eski Worker'ın kapatılmış,
storage binding'siz sürümü 88cc5f34-904e-4ad6-b855-768fb0fd4f64.
Bir sorun olursa yeni hesaptaki uygun Worker sürümüne dönülür; DNS'yi veya
veriyi otomatik eski hesaba döndürmeyin.

## Geri dönüş

Kaynak Worker/D1/R2 silinmez. Kaynak kilitli sürüm: 8494f70c-9d4a-476e-92fd-9144bea41b9e;
kilit öncesi sürüm: 59d621ae-881d-4358-92b0-b16b67e6f935.
Yeni hedefte henüz yazma yoksa eski snapshot hâlâ geçerlidir; eski zone/TLS
durumu ayrıca doğrulanmadan NS geri dönüşü hazır sayılmaz. Hedefte yeni yazma
açıldıktan sonra eski DB'ye doğrudan dönülmez: önce güncel hedef D1/R2 güvenli
olarak ters aktarılır veya hedefte ileri düzeltme yapılır. Veriyi eski snapshot'la ezmeyin.

Kopya karşılaştırmaları günlük D1 tasarruf oranı ölçümü değildir. Eski kaynak ve
özel yedekler en az yedi gün korunur; bu ifade otomatik silme yetkisi değildir.
