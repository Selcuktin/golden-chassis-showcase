# Yayın hazırlığı denetimi — 14 Ekim 2026

## İş modeli ve kapsam

ByCar bir pazar yeri değildir: yönetici tarafından girilen araçların fiyatsız
vitrini, satılmış araçların referans gösterimi, WhatsApp danışmanlığı ve D1'de
tutulan teklif/özel ithalat taleplerinden oluşur. Taslaklar yalnızca yöneticide
görünür. Sabit fiyat, ödeme veya otomatik e-posta gönderimi yoktur. WhatsApp
bağlantısı mesajı hazırlar; mesajın gönderilmesi müşterinin işlemidir.

Denetim; katalog/SSR, API, panel, veri kalıcılığı, medya yaşam döngüsü, hata
yanıtları, erişim sınırları, iki dil, sitemap ve alan adı geçişini kapsar. Gerçek
müşteri verisine test kaydı yapılmaz. Değişiklikler feature branch ve PR ile geçer.

## Bulunan ve giderilen sorunlar

| Bulgu                                                                                    | Son davranış ve doğrulama                                                                                                                                             |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Form, D1 kaydı başarısız olduğunda da başarı gösteriyordu.                               | Sunucudan JSON kayıt kimliği gelmeden başarı/WhatsApp adımı açılmaz. 429/503 durumlarında form korunur; çift gönderim engellenir.                                     |
| Müşteri formu yerel CRM kaydı ve katalog yazma işlemi de başlatıyordu.                   | Ziyaretçi yalnızca `/api/inquiry` çağırır; sahte yerel müşteri kaydı yoktur.                                                                                          |
| Talep silme tarayıcıda kalıyor, durum değiştirme hataları gizleniyordu.                  | Yetkili silme endpoint'i ve onay bekleyen istemci eklendi. Bulunmayan talepler 404, hatalar başarısız yanıt verir.                                                    |
| Boş katalog, taslağa alınan veya silinen örnek araçlar geri gelebiliyordu.               | D1 ve sunucu loader'ı tek gerçek kaynaktır. Boş liste korunur; eksik/taslak ilan gerçek 404 döner.                                                                    |
| Statik sitemap, Worker'ın dinamik sitemap'ini gölgeliyordu.                              | Statik dosyalar kaldırıldı. Sitemap yalnızca aktif D1 araçlarını içerir; robots ve canonical aynı alan adını kullanır.                                                |
| Yönetici düzenlemeleri ziyaretçi vitriniyle aynı yerel depoyu kullanıyordu.              | Her yönetici sekmesinin taslak/veri/revizyonu sessionStorage'da ayrıdır. Ziyaretçi SSR/API verisini kullanır.                                                         |
| Eşzamanlı kayıtlar çakışıyor; 409 sonrası otomatik okuma taslağı siliyordu.              | İstemci kayıtları sıraya koyar. 409'da taslak korunur; sunucu verisini yüklemek açık bir kullanıcı işlemidir.                                                         |
| Elle senkronizasyon önce sunucuyu okuyup yerel değişikliği kaybediyordu.                 | Elle senkronizasyon mevcut taslağı gönderir; başarısızlığı çağırana iletir.                                                                                           |
| Büyük kayıtta farklı batch'ler kısmen commit olabiliyordu; force kontrolü yarışa açıktı. | Tüm D1 mutasyonları ve normal/force revizyon kontrolü tek atomik batch'tedir. Parametreler D1 sınırı altında gruplanır. 35 araçla yarış/rollback testleri vardır.     |
| Paneldeki araç sıralaması kalıcı değildi.                                                | `0003_catalog_order.sql`, mevcut sırayı koruyarak `sort_order` ekler. Öne çıkarılan araçlar önceliklidir; grup içinde yönetici sırası kullanılır.                     |
| Son aracı silme ve yeni eklemeyi geri alma sunucuyla uyuşmuyordu.                        | Son araç yalnızca kendi kimliğiyle silinir. Ekleme işlemini geri almak, yeni kimliğin sunucudan silinmesini de kuyruğa alır.                                          |
| R2 görselleri hemen silindiği için geri alma görselleri kurtaramıyordu.                  | Emekliye ayrılan dosyalar aynı D1 batch'inde 24 saat bekleme kuyruğuna alınır. Geri alma süresi 24 saattir; sonrasında JSON/SQL ihracı R2 dosyalarını geri getiremez. |
| Medya temizliği CMS kapağı/video referanslarını atlayabiliyordu.                         | Silmeden önce görsel, video ve CMS referansları kontrol edilir. R2 hata/tekrar deneme gerçek bağlamalarda test edilir; kısmi hata tam başarı olarak raporlanmaz.      |
| JSON/SQL ihracı hatalı veri veya uydurma R2 anahtarları üretebiliyordu.                  | JSON ithali şema doğrulaması yapar. SQL ihracı UPSERT kullanır, ilişkileri ve gerçek medya anahtarlarını korur. CRM kayıtları katalog ithaliyle geri yüklenmez.       |
| Geçersiz gövdeler 500 üretebiliyor; yalnızca Content-Length kontrol ediliyordu.          | Akış okunurken sınır uygulanır: katalog 5 MB, diğer JSON istekleri 64 KB. İç içe CMS alanları, URL protokolleri ve telefon doğrulanır.                                |
| Paralel müşteri istekleri rate-limit sayımını aşabiliyordu.                              | D1 kabul işlemi tek atomik SQL ifadesidir. Aynı IP'den 10 eşzamanlı isteğin yalnızca 5'i kabul edilir.                                                                |
| D1 arızası başarılı hafıza/boş katalog yanıtıyla gizleniyordu.                           | D1 okuma hatası 503 döner; sağlık kontrolü D1/R2'ye gerçekten erişir. Üretimde eksik DB ile kalıcı kayıt başarısı verilmez.                                           |
| Eski commit sabiti yayın sürümünü yanlış gösteriyordu.                                   | Derleme Git SHA'sını içine alır; kontrollü dağıtımda commit ayrıca Worker değişkeniyle verilebilir.                                                                   |

Panelde değiştirilen WhatsApp numarası/şablonu ve konum, SSR dahil tüm genel
bağlantılara açıkça aktarılır; ziyaretçi iletişimi yönetici taslak deposuna bağlı değildir.

Araç, müşteri talebi, fotoğraf, yorum/SSS/etiket silme; medya GC, geri alma,
yedek yükleme ve varsayılana dönme gibi veri değiştiren toplu işlemler onay
penceresi gerektirir. İptal, silme isteği göndermeden işlemi durdurur.

## Doğrulama

### Antigravity geliştirmeleri sonrası son kontrol

İncelenen main: `221b8d4` (PR #5–#13 dahil). Video yükleme, SSS düzenleme,
sekme hatırlama, WebP/mobil hero ve yalnızca yayınlanmış araçlardan türetilen
filtreler incelendi. E-posta doğrulaması sahibinin kararıyla kaldırılmıştır;
`CF_ACCESS_REQUIRED=false` korunur. Eski Access değişkenleri kalsa bile parola
girişi çalışır. Tüm özel okuma/yazma yolları yine geçerli uygulama oturumu ister.

Bu kontrolde video parçalarındaki yanlış `Content-Length` gerçek yerel R2 ile
yeniden üretildi: 4 baytlık yanıtta 24 bayt bildiriliyordu. Tam, açık uçlu ve sondan
byte-range yanıtları doğru boyutla sunulur; HEAD Range'i yok sayar, dosya dışı
aralık 416 döner. Depolama arızası artık sahte 404 yerine 503 verir. Yüklemeler
Content-Length bulunmasa da okunurken 5/50 MB sınırında kesilir. Üretimde D1
bağlaması eksikse API bellek üzerinden giriş/kayıt başarısı vermez.

Panelde video yüklenirken yayınlama da engellenir. Form sıfırlandıktan veya başka
araç açıldıktan sonra tamamlanan eski yükleme yeni forma eklenmez. Tarayıcı MIME
türünü boş verdiğinde WebM/MOV uzantısına uygun tür gönderilir; sunucu dosya
imzasını ayrıca kontrol eder.

Canlıda salt okunur D1 incelemesi: `quick_check=ok`, yabancı anahtar ihlali yok,
0000–0003 migration'ları ve iki trigger mevcut; eski seed hesabı, NULL ayar,
bozuk araç JSON'u ve görselsiz araç yok. 13 araç (8 aktif, 1 satılmış, 4 taslak),
84 görsel kaydı, 2 talep ve 1 yönetici vardır. Talep/oturum içerikleri veya
parola hash/salt değerleri rapora alınmaz. Genel katalog yalnızca 9 aracı içerir.
Taslaklar dahil 84 farklı medya bağlantısı HEAD ile kontrol edildi; eksik dosya yoktur.

Canlı salt okunur kontrolü 76 kontrolü, 9 ilanı ve 58 medya yolunu hatasız geçti.
Tarayıcıda TR/EN geçişi ve BMW filtresi incelendi. Mutasyon, şifre değiştirme,
silme, geri alma ve müşteri kaydı testleri ayrı yerel D1/R2 üzerinde çalışır.

- Node 24: TypeScript, ESLint, Vitest, gerçek yerel Wrangler/workerd D1/R2,
  üretim derlemesi, Drizzle snapshot tutarlılığı ve `npm audit`.
- Son yerel sonuç: 146 uygulama testi ve 24 gerçek D1/R2 entegrasyon testi başarılı;
  typecheck/lint/build/snapshot kontrolü başarılı, audit açık sayısı 0.
- Yerel Worker; ayrı DB/R2 kimlikleriyle migration'dan kurulur. Gerçek SSR,
  statik dosya sunumu, ilan sayfası, 404, sitemap ve robots ağ üzerinden incelenir.
- `npm run check:site -- https://<canli-adres>` salt okunur yayın kontrolüdür:
  sağlık, tüm genel ilanlar, katalog görselleri/videoları, asset türleri,
  sitemap-katalog eşleşmesi, canonical, parola formu ve anonim özel API reddini doğrular.
  Access ileride açılırsa betiği `CF_ACCESS_REQUIRED=true` ortam değişkeniyle çalıştırın.
- Testler üretim hesabına bağlı kaynakları kullanmaz. Canlıda müşteri formu,
  şifre değiştirme, katalog silme veya GC testi çalıştırılmaz.

## Güvenli yayın sırası

1. Bütün CI kontrolleri başarılı olmalı. Üretim D1'i repodan ayrı, özel dizine
   `wrangler d1 export DB --remote --config wrangler.toml --output <yedek.sql>`
   ile yedekleyin; SQL dosyası müşteri verisi ve parola hash'i içerir.
2. `npm run db:migrate:remote` ile yalnızca bekleyen migration'ları uygulayın.
3. PR'ı merge commit ile birleştirin; yayımlanmış geçmişi yeniden yazmayın.
4. İncelenmiş main ağacını derleyip üretilen Worker yapılandırmasıyla yayınlayın.
   `npx wrangler deploy --config .output/server/wrangler.json`.
5. Canlı salt okunur kontrolü çalıştırın ve sağlık commit'ini karşılaştırın.
   Sorunda önceki Worker sürümüne dönülebilir; eklenen kolon geri dönüşte yerinde
   kalabilir. İncelenmemiş ters migration veya yedekten toplu üstüne yazma yapmayın.

## Alan adı alındığında

1. Satın alınan adı Cloudflare'e ekleyin, nameserver/DNS ve TLS etkinleşsin.
2. Aynı Worker'a ana alan adını ve `www` adresini custom domain olarak bağlayın.
3. Her iki alan adı çalıştıktan sonra Worker'ın kalıcı yapılandırmasına
   `SITE_URL = "https://<ana-alan-adi>"` ekleyip yayınlayın. Bu ayar canonical,
   sitemap, robots ve alternatif adreslerden 308 yönlendirmesini etkinleştirir.
   Bir alan adı örneğini satın alınmadan etkinleştirmeyin. POST yönlendirmesi
   yöntemi/gövdeyi korur; kullanıcı yeni adreste panel parolasıyla yeniden giriş yapar.
4. Ana adresle `check:site` çalıştırın; `www` yönlendirmesini, panel
   girişini, WhatsApp/telefonu ve gerçek müşteri talebinin panelde görünmesini
   sahibinin son kabul kontrolüyle doğrulayın.
5. `info@...` adresini kullanacaksanız ayrıca posta hizmeti ve onun MX/SPF/DKIM
   kayıtlarını kurun. Alan adı satın almak posta kutusu oluşturmaz.

## İşletme ve bakım sınırları

- Telefon sahibi tarafından doğrulandı. Tam showroom adresi (Bursa Etiler),
  çalışma saatleri, sosyal hesap ve kurumsal metinler yayından
  önce panelden gerçek bilgilerle son kez onaylanmalıdır. Kaynakta hâlâ örnek
  adres/metin varsayılanları bulunur. Son canlı kontrolde hâlâ “Fethiye Bulvarı,
  No: 42, Nilüfer / Bursa” görünür; bu, sahibinin bildirdiği Etiler bilgisiyle
  uyuşmaz. Gerçek adres ve harita panelden güncellenmeden tamamlandı sayılmamalıdır.
  `info@bycarglobal.com` bağlantısının posta kutusu da ayrıca doğrulanmalıdır.
- JSON/SQL veri ihracı tam D1/R2 yedeği değildir. Düzenli D1 yedeği ve R2
  kurtarma politikası işletim sorumluluğudur; bu PR zamanlanmış otomasyon kurmaz.
- Tek kayıtta 35 araç, araç başına 50 görsel ve 5 MB istek sınırı vardır.
  Cloudflare planının günlük sorgu, CPU, trafik ve depolama kotaları ayrıca
  geçerlidir. Kota/ağ/sağlayıcı arızası için hatasız çalışma garantisi verilmez.
- Mevcut parola/oturum sistemi korunur; Cloudflare Access şu anda kapalıdır. Auth
  sağlayıcısına tam geçiş ve büyük API modülünün ayrılması ayrı mimari işlerdir.
- Uygulama oturumu 24 saattir ve sekme oturumunda saklanır. E-posta kodu istenmez;
  süre dolunca/yeni tarayıcıda panel parolası gerekir. `ADMIN_PASSWORD` ortam
  sırrı mevcut acil giriş yoludur; panelden parola değiştirmek bu sırrı döndürmez.
- Sohbette paylaşılmış Cloudflare API token'ı iptal edilip yenilenmelidir.
- GitHub `quality` ve `audit` kontrolleri çalışır. Hesap düzeyindeki main branch
  korumasının etkinliği bu kod PR'ıyla garanti edilmez; repository ruleset'iyle
  zorunlu kontroller ayrıca yönetilmelidir.

Bu rapor test edilen sürüm ve akışlar için kanıttır; tüm gelecekteki değişiklikler
ve dış servisler için “sıfır hata” garantisi değildir.
