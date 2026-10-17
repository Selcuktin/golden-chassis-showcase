# ByCar Etiler — Cloudflare hesap taşıma planı

Hazırlık: 18 Ekim 2026. Hedef uygulama günü: 19 Ekim 2026, sahibiyle belirlenecek
düşük trafik saatinde. Bu belge bir uygulama planıdır; yeni hesapta kaynak oluşturma,
üretim yedeği alma, DNS değiştirme veya veri taşıma bu hazırlık kapsamında yapılmadı.
Kaynak bilgileri uygulama gününde yeniden doğrulanacak.

Amaç: yalnızca ByCar'ın Worker, D1 ve R2 kaynaklarını ve domainin Cloudflare DNS
yönetimini yeni hesaba geçirmek. Diğer projeler eski hesapta kalır. Domain, araç
adresleri, medya anahtarları, içerikler ve mevcut panel parolası korunur.
Kesintisizlik garantisi verilmez: D1 export kısa süre sorguları bloke edebilir;
nameserver ve TLS geçişi ayrıca bekleme gerektirebilir. Veri kaybını önlemek için
yazma durdurulur ve kabul ölçütleri sağlanmadan hedefte yazma açılmaz.

## 1. Bilinen kaynaklar ve doldurulacak hedef kaydı

| Bileşen               | Kaynak / korunacak değer                                                              | Hedefte yapılacak                                                                       |
| --------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Cloudflare hesap ID   | `371caa7e632e84151d1de536dc76b2e1`                                                    | Yeni hesap ID'sini ayrı kaydet; kaynakla farklı olduğunu doğrula                        |
| Worker                | `selcuktin-golden-chassis-showcase`                                                   | Yeni hesapta yeniden yayınla; hesap alt alanı değişir                                   |
| D1                    | `bycar_db`, ID `cb9bbc34-a9ef-446e-b993-46405a7ca765`                                 | Yeni veritabanı ve yeni ID; `DB` binding adı korunur                                    |
| R2                    | `bycar-media`                                                                         | Yeni hesapta bucket oluştur; `BUCKET` binding adı ve nesne key'leri korunur             |
| Domain                | `https://bycaretiler.com`                                                             | Aynı adres; yeni zone ID ve yeni nameserver'lar                                         |
| Domain registrar      | Turkticaret.net; IANA ID 819                                                          | Registrar değiştirilmez; ilgili yönetim panelinde NS güncellenir                        |
| Kayıt tarihi          | RDAP: `2026-10-15T11:39:33Z`                                                          | Registrar transferi yapılmadığından yeni kayıt transfer kilidi bu planın adımı değildir |
| Mevcut NS             | `rosa.ns.cloudflare.com`, `titan.ns.cloudflare.com`                                   | Hedef zone'un gerçekten verdiği NS'ler kullanılacak; tahmin edilmeyecek                 |
| DNSSEC                | 18 Ekim RDAP yanıtında `delegationSigned=false`                                       | Geçişten önce parent DS kaydı ayrıca sorgulanacak                                       |
| Ana domain bağlantısı | Apex custom domain; `www.bycaretiler.com/*` Worker route                              | Yeni zone aktif olduktan sonra aynı davranış yeniden kurulacak                          |
| Uygulama ayarları     | `NODE_ENV=production`, `SITE_URL=https://bycaretiler.com`, `CF_ACCESS_REQUIRED=false` | Canlı hedefte aynı kalır; e-posta/OTP tekrar açılmaz                                    |
| İncelenen kod tabanı  | `2600c427e19942f0032d3766d4038cb58ea872a2`                                            | İşlem günündeki onaylı main SHA'sı yeniden sabitlenir                                   |
| Şema geçmişi          | `drizzle/0000`–`0004`, 5 migration                                                    | İşlem gününde kaynak geçmişi ve repoyla eşleştirilir                                    |

Hedef hesap ID, yeni D1 ID, Worker önizleme adresi, yeni zone ID, NS'ler, TLS
durumu, yedek özeti ve son yayın SHA'sı operasyon kaydına yazılır. Token, parola,
müşteri bilgileri ve ham SQL bu belgeye veya Git'e konmaz.

## 2. İşlem öncesi kapılar

- [ ] İki hesaba erişim ve Turkticaret'in gerçek domain yönetim paneline erişim hazır.
- [ ] Hedefte Workers ve D1 kullanılabiliyor; R2 etkinleştirilmiş. Ödeme/şart onayı
      gerekiyorsa sahibi tamamlıyor. Ücretli plan kendiliğinden açılmıyor.
- [ ] Hesap listesinde hedef ID doğrulanmış. Her CLI işleminde doğru hesap ID ve
      açık config yolu var; yalnızca açık tarayıcı oturumuna güvenilmiyor.
- [ ] Kaynak erişimi yalnız ByCar'a, hedef erişimi yalnız hedef hesaba ayrılmış.
      R2 kopyası için kaynakta okuma, hedef bucket'ta okuma/yazma yetkisi kullanılıyor.
- [ ] Kaynağın D1 günlük kotasında export, sayım ve kontrol için pay var. Kota
      dolmuşsa taşıma başlatılmıyor; yenilenmesi bekleniyor.
- [ ] Mevcut DNS kayıtları, proxied durumları, TTL, MX/TXT/SPF/DKIM/DMARC, CAA,
      doğrulama kayıtları ve varsa Email Routing envanteri alınmış.
- [ ] TLS, yönlendirme, cache, WAF/rate limit, bot, Analytics ve varsa Turnstile,
      GitHub/Workers Builds bağlantıları ayrı envanterde. DNS export bunları taşımaz.
- [ ] Bekleyen Lovable/başka araç değişikliği yok. Otomatik yayınlar ve manuel panel
      değişiklikleri bakım boyunca koordine edilmiş; onaylı SHA sabitlenmiş.
- [ ] Üretim kaynaklarıyla yazma/silme testi yapılmıyor. Gerçek testler yalnız ayrı
      yerel D1/R2 bağlamalarında ve gerekiyorsa açıkça ayrılmış test kaynaklarında.

Bugünkü repo CI dosyası yalnız kalite denetimi yapıyor; Cloudflare deploy adımı
içermiyor. Buna rağmen dashboard'daki Workers Builds/Git bağlantısı uygulama
gününde kontrol edilmeli; eski hesaba yeniden yayın yapması engellenmeli.

## 3. Ayrı konfigürasyon ve prova

1. Uygulama çalışmaları `codex/` feature branch'inde ve PR'da hazırlanır. Main'e
   doğrudan push, force push, yayımlanmış commit'lerde rebase/squash yapılmaz.
2. Kaynak ve hedef için ayrı, açık `account_id` içeren Wrangler config'leri kullanılır.
   Hedef config kaynak D1 ID'sini içeremez. Kaynak hesabın config'i final export ve
   geri dönüş için korunur. Geçici config ve özel dosyalar Git dışında tutulur.
3. Yeni Worker'ın önizleme config'inde `routes=[]` olmalı. Mevcut production
   route'ları yeni hesapta körlemesine deploy etmek zone hatası doğurabilir.
4. Önizlemede `SITE_URL` yeni Worker'ın kendi HTTPS adresine ayarlanır. Aksi halde
   `src/server/site-origin.ts` her isteği eski canlı siteye 308 ile yönlendirir ve
   yanlış sistemi test etmiş oluruz. Önizlemeye noindex uygulanır, sitemap gönderilmez.
5. Hedefte üretim parolası ile oturum açmadan önce erişimi sınırlandırılmış doğrulama
   ortamı hazırlanır. Önizleme linki herkese dağıtılmaz; noindex erişim kontrolü değildir.
6. Tüm kalite kontrolleri ve CI geçer: typecheck, Drizzle snapshot, lint, Vitest,
   gerçek yerel D1/R2 entegrasyonu, build, npm audit. Veri kopyalama yardımcısı ve
   bakım kilidi hazırlanırsa bunların davranışı da yerelde test edilir.
7. Derlenmiş `.output/server/wrangler.json` ayrıca incelenir: doğru hedef hesap,
   yeni D1, hedef R2, doğru `SITE_URL` ve o aşamaya uygun route'lar bulunmalı.
   Eski derleme/config taşınmaz; sabitlenen commit'ten yeniden build alınır.

## 4. Yazma kilidi — son yedekten önce zorunlu

Sadece admin panelini kapatmak yeterli değildir: `/api/inquiry` müşteri kaydı,
login/logout ve parola işlemleri D1'e yazabilir; medya yükleme ve GC R2'yi değiştirir.

Uygulama PR'ında, istek işleyicilerinden önce çalışan geçici bakım/yazma kilidi
hazırlanır ve yerelde denenir. Bu özellik bugün repoda mevcut sayılmaz.

- Kaynakta tüm değiştirici HTTP yöntemleri, admin giriş/çıkış/parola işlemleri,
  CMS kaydı, müşteri formu, upload ve GC durur. Canonical yönlendirmeden önce
  uygulanarak `workers.dev` ve bütün alias'larda da geçerli olur.
- Engellenen işlem açık bir geçici bakım yanıtı alır (`503`, `Retry-After`,
  `Cache-Control: no-store`); kayıt alınmış gibi `200` dönülmez.
- Varsa cron, kuyruk tüketicisi, haricî script ve doğrudan DB/R2 yazıcıları durur.
  Devam eden yazıların tamamlandığı doğrulanır; ardından kilit zamanı kaydedilir.
- Hedef kopyada da kullanıcı yazmaları kapalı kalır. DNS yayılırken iki ayrı DB'ye
  yazma açılmaz. Kaynakta kilit kaldırılmaz; yalnız hedef kabulden sonra açılır.
- Ziyaretçi bakım sırasında form gönderemeyebilir; formu daha sonra tekrar
  göndermesi gerekir. Sıfır yazma kesintisi için ayrıca incelenmiş tek-yazıcı
  yönlendirme çözümü gerekir; bu planda varsayılmaz.

## 5. D1 aktarımı — şema migration ile, veriler aynı değerlerle

1. Kaynak kilitlendikten sonra tam SQL kurtarma yedeği alınır. D1 export sırasında
   sorguların bloke olabileceği hesaba katılır. Yedek `.wrangler/backups/` gibi
   ignore edilmiş özel dizine yazılır; boyutu ve SHA-256 özeti kaydedilir.
2. Export'un gerçekten açılabildiği ve dokuz uygulama tablosunu içerdiği özel yerel
   kopyada doğrulanır. Tam yedek parola hash/salt'ı, oturum ve müşteri verisi içerir;
   terminal çıktısı, PR, issue veya herkese açık buluta yüklenmez.
3. Yeni boş hedef DB, repodaki değişmemiş migration'larla kurulur. Böylece trigger,
   NOT NULL, CHECK, foreign key ve indeksler yalnız versioned migration'lardan gelir.
4. Kaynak snapshot'tan yalnız uygulama verisi aktarılır. `d1_migrations` ve SQLite
   iç tabloları veri importuna katılmaz. Hedef geçmişi migration CLI oluşturur;
   SQL dump'ı import edip geçmişi silerek migration'ları tekrar oynatmayız.
5. İçe aktarma yardımcısı önce gerçek yerel D1 üzerinde denenir. Kaynak dosyadan
   güvenli SQL/parametreli kayıt üretir; string replace ile dump dönüştürmez.
   `vehicles` → `vehicle_images`/`inquiries`; `admin_users` → `admin_sessions`
   bağımlılık sırası korunur. Diğer bağımsız tablolar da eksiksiz taşınır.
6. `0001` boş hedefte `site_settings.cms_revision=1` oluşturur. Kaynak ayarları
   aktarılırken bu bilinen seed çatışması, yalnız o tablonun anahtarı için
   `ON CONFLICT(key) DO UPDATE` ile kaynak değer/zamanını aynen koruyan restore
   işlemiyle çözülür. Genel `INSERT OR REPLACE` kullanılmaz; cascade kaybı riski var.
   Özel veriler migration dosyalarına eklenmez. Bu restore veri kopyasıdır;
   keşfedilen veri onarımı ayrı migration ve test gerektirir.
7. Kaynakta olup yerel Drizzle şemasında bulunmayan tablo/kolon/trigger varsa durulur;
   sessizce atlanmaz. Kaynak migration geçmişi hedef repo sürümüyle uyuşmalı.
8. Import yarıda kalırsa hedef yayınlanmaz. Kaynak bozulmadan kalır; yeni boş
   hedef DB'de aynı doğrulanmış restore yeniden yapılır. Parçalı import üstüne
   tekrar tekrar veri eklenmez ve kaynak DB silinmez.

Aktarılacak uygulama tabloları: `vehicles`, `vehicle_images`, `inquiries`,
`admin_users`, `admin_sessions`, `login_attempts`, `site_settings`,
`inquiry_attempts`, `r2_cleanup_queue`.

Kabul: her tablonun satır sayısı ve PK sırasıyla üretilen deterministik içerik
özeti kaynak/hedefte aynı; CMS revision/ayarlar aynı; araç sıralaması ve durumlar
aynı; `PRAGMA quick_check` sonucu `ok`, `PRAGMA foreign_key_check` boş. Beş
migration ve iki NULL-key trigger'ı mevcut. Gizli değerler karşılaştırılır ama
rapora yazılmaz. Gelecekte farklı migration sayısı varsa sabit beş kullanılmaz.

## 6. R2 aktarımı — dosya adları ve içerik korunur

1. Hedef bucket boş ve doğru hesaptadır. Kaynak bucket private kalır; aktarım için
   public erişim veya kalıcı dışa açık link oluşturulmaz.
2. Rclone/S3 ile yalnız `bycar-media` kopyalanır. İlk toplu kopya önceden yapılabilir;
   yazma kilidi sonrası son fark kopyası ve doğrulama zorunludur.
3. `rclone copy` kullanılır; kaynağı silen `move` veya kontrolsüz `sync` kullanılmaz.
   Nesne key'leri, büyük/küçük harf, klasörler, Content-Type, Cache-Control ve varsa
   özel HTTP metadata korunur. Metadata aktarımı küçük bir yerel/test fixture'ında
   doğrulanmadan gerçek kopya tamamlanmış sayılmaz.
4. Nihai kaynak/hedef manifesti key, boyut ve içerik özetiyle karşılaştırılır.
   Multipart ETag içerik hash'i sayılmaz; gerekirse `rclone check --download`
   veya indirilen byte'ların SHA-256 karşılaştırması kullanılır. Bu tam doğrulama
   zaman/R2 okuma işlemi tüketir; öncesinde boyut ve kota kontrol edilir.
5. `vehicle_images.r2_key` referanslarının hepsi hedefte bulunmalı. DB'de referanssız
   nesneler de kopyalanır; taşıma sırasında temizlik/yeniden WebP üretimi yapılmaz.
   Cleanup kuyruğu korunur, otomatik silme işi kabul süresince kapalı kalır.
6. DB'deki `/api/media/...` yolları korunur. Eski hesabın mutlak workers.dev/R2
   linkleri varsa ayrıca envantere alınır; rastgele URL replace yapılmaz.

## 7. Worker ayarları ve panel girişi

- Yeni Worker aynı onaylı commit'ten yayınlanır. Production ortamında `DB` ve
  `BUCKET` zorunludur; memory fallback ile başarılı sayılmaz.
- `wrangler secret list` yalnız adları gösterir; mevcut secret değerleri geriye
  okunamaz. `ADMIN_PASSWORD` gibi gereken değerler sahibinin güvenli kaynağından
  hedefe yeniden tanımlanır. Cloudflare API token'ı Worker secret'ı yapılmaz.
- Panelde değiştirilmiş parola D1 `admin_users` satırlarında korunur. Hash/salt,
  iterasyon ve oturum verileri değiştirilmez; eski seed parola geri yüklenmez.
  Env fallback parolası panel parolasından farklı olabilir; biri diğerinin yerine
  varsayılmaz. Yeni kimlik doğrulama kodu yazılmaz.
- `CF_ACCESS_REQUIRED=false` kalır. Eski Access uygulaması/izin verilen mail listesi
  taşınması bu planın işi değildir; e-posta doğrulaması geri gelmez.
- İşlev testleri gerçek yerel D1/R2'dedir: login/logout, parola koruma, araç CRUD,
  sıralama/taslak/satıldı, eski revision 409, fotoğraf WebP/yükleme, GC, müşteri
  formu, durum/silme onayı. Üretime sahte müşteri/araç kaydı gönderilmez.
- Canlıda sahip mevcut parolasıyla normal girişini doğrular; şifre/OTP sohbete
  yazılmaz. Oturumların korunması kopyalanan geçerli D1 kayıtlarına bağlıdır;
  sona ermiş oturumu canlandırma sözü verilmez.

## 8. Domain ve TLS geçişi — son operasyonel adım

1. Hedefte `bycaretiler.com` zone'u oluşturulur. Kaynak DNS export'u gözden
   geçirilerek içe aktarılır. Otomatik taramanın proxied Cloudflare IP'lerini gerçek
   origin gibi kopyalamasına güvenilmez. Worker-managed apex kaydı yeni Worker'a
   ait olarak yeniden oluşturulur; eski hesaba ait hedef aynen bırakılmaz.
2. DNS dışındaki TLS, redirect/cache/güvenlik ayarları ve Analytics yeniden kurulur.
   Mevcut analytics geçmişinin hedef hesaba taşınacağı varsayılmaz. CSP'nin
   Cloudflare beacon izni korunur. MX/TXT ve sahiplik doğrulama kayıtları korunur.
3. NS değişiminden hemen önce registry/parent DS sorgulanır. DS varsa eski DNSSEC
   bağı güvenli biçimde kaldırılır ve DS'nin kalktığı doğrulanmadan NS değiştirilmez.
   Şimdiki kapalı durum yarın için varsayılmaz; DNSSEC'siz süre kısa tutulur.
4. Önce D1/R2 ve bağımsız önizleme kabul ölçütleri tamamlanır. Sonra registrar
   panelindeki NS'ler hedef zone'un verdiği değerlere değiştirilir. Registrar
   transferi/EPP kodu veya domain satın alma işlemi yapılmaz.
5. Cloudflare hedef zone `Active` olana kadar beklenir. Custom Domain aktif zone
   ister; önceden bağlanmış/sertifika hazır varsayılmaz. Pending zone'da TLS ve
   Worker hizmeti garanti değildir. Bu nedenle kısa bakım aralığı planlanır.
6. Apex custom domain yeni Worker'a bağlanır; `www` için proxied DNS + Worker
   route yeniden kurulur. CNAME/custom-domain çakışması varsa yalnız ilgili hedef
   kayıt sahipliği incelenir; bütün DNS kayıtları silinmez.
7. Hedefin canlı config'i `SITE_URL=https://bycaretiler.com` olur. Preview noindex
   yalnız production'dan kaldırılır. Gerekirse bu iki adım bakımda art arda yapılır;
   yönlendirme döngüsü üreten eski SITE_URL ile servis açılmaz.
8. TLS sertifikasında apex ve www kapsaması, CAA uyumu, HTTPS erişimi; HTTP/www
   yönlendirmelerinde path/query korunması kontrol edilir. DNSSEC önceden açıksa
   yeni hesap anahtarlarıyla yeniden kurulur; eski DS geri kullanılmaz.
9. DNS yayılımı sırasında kaynak yazmaya kapalı kalır. Birden fazla resolver ile
   NS/HTTPS doğrulanır; kabul raporu hazır olduğunda yalnız hedefte yazma açılır.

## 9. Canlı kabul ve bitiş koşulları

- [ ] `/api/health`: `status=ok`, `d1=true`, `r2=true`, tam onaylı commit SHA.
- [ ] `/api/cms` kaynağı D1; görünen araç sayısı/ID/sıra/durum kaynak snapshot'la aynı.
- [ ] Gizli taslaklar halka açılmamış; yetkisiz admin API'leri 401 dönüyor.
- [ ] Tüm medya referansları okunuyor; Content-Type/Range ve CSP doğru.
- [ ] `npm run check:site -- https://bycaretiler.com` başarılı; bu script salt okunur.
- [ ] Mobil/masaüstü katalog, araç detayı, form görünümü ve panel normal giriş
      sahibiyle kontrol edilmiş; üretimde sentetik veri oluşturulmamış.
- [ ] Canonical, robots, sitemap ve JSON-LD eski önizleme domainini içermiyor.
      Domain aynı kaldığından Search Console adres değişikliği talebi yapılmıyor.
- [ ] Yeni hesaptaki D1 metrikleri gelen trafiği gösteriyor. Eski ByCar D1'e
      uygulama yazması gitmiyor; diğer iki proje kaynak hesapta çalışmaya devam ediyor.
- [ ] `wrangler.toml` hedef account/D1/bucket bilgileriyle PR üzerinden güncellenmiş;
      `.output` yeniden üretilmiş, Git/Lovable yayın hedefi yeni hesap olarak teyit edilmiş.
- [ ] Hedef yedekleme, kota takibi ve operasyon kaydı tamam; kaynak yedekler özel.

## 10. Geri dönüş — yeni kayıt var mı, önce bunu belirle

**Hedefte kullanıcı yazmaları henüz açılmadıysa:** kaynak veriler aynı snapshot'tır.
Hedef bakımda bırakılır; kaynak zone/TLS yeniden kullanılabilirliği doğrulandıktan
sonra uygun DNS/Worker geri dönüşü uygulanır. Eski zone `Moved Away` durumuna
geçebileceğinden yalnız NS'leri geri yazmak yeterli sayılmaz. TLS ve resolver
kontrolleri geçmeden kaynak yazmaları açılmaz.

**Hedefte yeni yazma kabul edildiyse:** eski DB'ye doğrudan trafik geri verilmez.
Önce hedef yazmaları durur; hedefin güncel D1 ve R2 yedekleri alınır. Bu son durum
doğrulanmış restore yöntemiyle kaynak hesapta ayrı bir kurtarma DB/bucket'ına
aktarılır ve eşitliği kontrol edilir; yalnız sonra kaynak Worker binding'leri ve
yönlendirme değiştirilir. Tarihî kaynağın üstüne körlemesine restore yapılmaz.
Güvenli ters aktarım hazır değilse hedef bakımda kalır ve ileri yönde düzeltilir.

Eski kaynak Worker/D1/R2 başarıdan hemen sonra silinmez. En az yedi gün doğrulanmış
yedek ve kaynak kaynaklar tutulur; bu süre otomatik silme onayı değildir.
Cloudflare eski zone'u `Moved Away` durumundan yedi gün sonra `Deleted` durumuna
alabilir; DNS yapılandırma yedeği ve zone'u yeniden oluşturma seçeneği saklanır.
Eski Worker, bekleme sonunda bağımsız D1 kullanan ikinci site olarak bırakılmaz;
eski workers.dev adresi eski hostta DB'ye gitmeden ana domaine yönlendirebilir.
Yedekler ve geçici anahtarlar, saklama gereği ve sahibin onayıyla ayrıca temizlenir.

## 11. Operatör için yürütme özeti

1. Hedef hesap + domain paneli erişimi; kaynak/hedef envanteri ve sabit SHA.
2. Ayrı config'ler, yerel restore/kilit provası, tüm kalite kapıları ve PR.
3. Hedef D1 migration kurulumu, R2 ilk kopya, izole önizleme.
4. Kaynak yazma kilidi → son D1 export → veri restore → son R2 kopyası.
5. Tablo içerik/sayım, şema/trigger/geçmiş, medya hash/metadata eşitliği.
6. DNS export → hedef zone ayarları → DS kontrolü → NS geçişi.
7. Zone Active → apex/www bağlantıları + TLS → production SITE_URL → salt okunur kabul.
8. Sahip giriş onayı → yalnız hedefte yazmayı aç → metrik/hata gözlemi → rapor.
9. Kaynağı silmeden bekle; sorun varsa yeni kayıt durumuna göre geri dönüş uygula.

## Kaynaklar

- [Cloudflare: domaini hesaplar arasında taşıma](https://developers.cloudflare.com/fundamentals/manage-domains/move-domain/)
- [Cloudflare: Worker Custom Domains ve aktif zone koşulu](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare: D1 import/export ve export sırasında sorgu bloklanması](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [Cloudflare: versioned D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare: R2 rclone kullanımı](https://developers.cloudflare.com/r2/examples/rclone/)
- [Rclone: silmeden copy](https://rclone.org/commands/rclone_copy/)
- [Rclone: içerik doğrulama](https://rclone.org/commands/rclone_check/)
- [Kaynak domainin public registry RDAP kaydı](https://rdap.verisign.com/com/v1/domain/bycaretiler.com)
- [Cloudflare Registrar hesap taşıması; bu domain için uygulanmayacak farklı süreç](https://developers.cloudflare.com/registrar/account-options/inter-account-transfer/)
