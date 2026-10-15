# ByCar Etiler — SEO ve yapay zekâ araması denetimi

Tarih: 15 Ekim 2026. Ana adres: https://bycaretiler.com/.
İş modeli: fiyatı danışmandan öğrenilen lüks otomobil vitrini, satılmış araç
arşivi ve özel araç tedariki. Ödeme veya siteden doğrudan satın alma yoktur.
İnceleme `seo-audit` skill'i, kaynak kod, gerçek tarayıcı DOM'u ve canlı HTTP
yanıtlarıyla yapılmıştır. Ayrı `ai-seo` skill'i bu ortamda kurulu değildir;
yapay zekâ araması için sağlayıcıların resmi belgeleri esas alınmıştır.

## Öncelikli bulgular ve düzeltmeler

| Öncelik / etki | Kanıt ve sorun                                                                                                              | Düzenleme                                                                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 / yüksek    | `robots.txt` bütün `/api/` yollarını kapattığı için gerçek araç görselleri `/api/media/` altında engelleniyordu.            | Daha özgül `Allow: /api/media/` eklendi; admin, diğer API ve server function yolları hariç tutuldu.                                                                                                           |
| P1 / yüksek    | Apex domain 200; `www` 522; Workers adresi kendi canonical'ıyla ayrı 200 üretiyordu.                                        | `SITE_URL` apex domaine sabitlendi. Apex custom domain ve mevcut proxied www DNS kaydı için Worker route tanımlandı. Alternatif origin'ler yol/sorgu ve HTTP yöntemini koruyan 308 kullanır.                  |
| P1 / yüksek    | HTML, WhatsApp şablonları ve D1 içeriğinde eski marka bulunuyordu.                                                          | Uygulama metinleri ve içerik varsayılanları ByCar Etiler oldu. `0004_bycaretiler_brand.sql` kayıtlı CMS ve araç açıklamalarını taşır; açık editörlerin eski veriyi ezmesini revision artışı engeller.         |
| P2 / orta      | OG başlık/açıklama CMS başlığından farklı; paylaşım görseli büyük PNG; araç açıklamaları sınırsız uzunlukta kopyalanıyordu. | Başlık/açıklamalar aynı kaynaktan üretilir. OG/Twitter başlık, açıklama, görsel ve marka tutarlıdır; WebP paylaşım görseli kullanılır. Araç metadata'sı gerçek yıl, model, km ve satış durumuyla oluşturulur. |
| P2 / orta      | İşlenmiş DOM'da AutoDealer vardı, fakat logo/iletişim ve WebSite kimliği eksikti; `modelDate` kullanılıyordu.               | AutoDealer, WebSite, CollectionPage/ItemList ve Car kimlikleri bağlandı. `vehicleModelDate`, gerçek kilometre/görsel/durum ve araç sayfasında BreadcrumbList kullanılır.                                      |
| P2 / orta      | İki responsive H1 ve yalnızca açılan SSS yanıtının HTML'i vardı.                                                            | Her görünümde tek, görünür koleksiyon H1'i; katalog açıklaması; tüm SSS yanıtları SSR HTML'inde, kapalı olanlar standart `hidden` ile saklanır. Düğmeler aria-expanded/controls taşır.                        |
| P3 / düşük     | Ana sayfa sitemap lastmod'u her istekte bugünün tarihi oluyordu.                                                            | Gerçek güncelleme tarihi olmayan ana sayfadan lastmod kaldırıldı; araçların gerçek D1 updated_at bilgisi korundu.                                                                                             |

Yeni migration şemayı değiştirmez; snapshot önceki şemayla aynıdır. Özel SEO
başlıkları korunur; yalnızca bilinen eski varsayılanlar değiştirilir. Yönetici
şifreleri/oturumları, legacy güvenlik salt işaretleri, müşteri geçmişi, araç
kimlikleri/slug'ları ve medya kayıtları taşımadan etkilenmez. Sahibi diğer
iletişim bilgilerini daha sonra vereceğini belirttiği için mevcut e-posta,
Instagram ve açık adres korunmuştur. Eski denetimler ve uygulanmış migration'lar
tarihsel kayıttır; geriye dönük düzenlenmemiştir.

## Yapay zekâ araması ve içerik

- Googlebot, Bingbot, OAI-SearchBot ve diğer arama botları için genel sayfalar
  robots seviyesinde açıktır. Aynı HTML insanlar ve botlar için sunulur; farklı
  botlara sahte içerik veya yapay bir işletme profili verilmez.
- Katalog, model detayları, gerçek kilometre/donanım ve SSS sunucu HTML'inde
  bulunur. Fiyat, müşteri puanı, adres koordinatı veya sertifika uydurulmaz.
- Yapılandırılmış veride fiyat sıfır olarak girilmez. Fiyatı yayımlanmayan bu
  vitrinin ürün/fiyat rich result kazanacağı iddia edilmez. Google'ın Vehicle
  Listing özel görünüm desteği de 2025'te kaldırılmıştır; Car verisi anlamsal
  tanımlama içindir.
- OAI-SearchBot arama içindir; GPTBot eğitimiyle aynı kontrol değildir. Mevcut
  eğitim politikası bu SEO işiyle değiştirilmez. Bot erişim kontrolü robots
  dosyasının yanında sağlayıcının CDN/WAF kararlarından da etkilenebilir.
- `llms.txt`, Google AI Overviews/AI Mode için gerekli değildir; özel bir AI
  schema veya sıralama garantisi yoktur. Bu nedenle mevcut içerik ve teknik
  erişim düzeltilmiş, bakım gerektiren ikinci bir yapay katalog oluşturulmamıştır.
- Türkçe canonical sürüm korunur. İngilizce düğmesi ayrı bir indekslenebilir
  dil URL'si değildir; gerçekte var olmayan `/en/` veya hreflang eklenmez.

Ana sayfa odağı: **ByCar Etiler, lüks otomobil koleksiyonu, süper spor otomobil,
özel araç tedariki**. Araç sayfaları kendi marka/model/yıl aramalarını karşılar.
İlçe, şehir ve yerel arama hedefi kesin adres gelince netleştirilmelidir.

## Doğrulama ve sonraki işletim adımları

Kalite kapıları: TypeScript, ESLint, Vitest, gerçek yerel D1/R2 entegrasyonu,
Drizzle snapshot kontrolü, üretim build ve npm audit. Yeni entegrasyon testleri
mevcut verili 0000–0003 yükseltmesini, içerik/iletişim/kimlik/R2 korunmasını,
yeniden uygulamada revision'ın sabit kalmasını ve hata durumunda tüm migration'ın
geri alınmasını doğrular. Üretimde yazma/silme testi yapılmaz; önce güvenli D1
export alınır, ardından migration uygulanır. Canlı kabul betiği:

```sh
npm run check:site -- https://bycaretiler.com
```

Yerel sonuç: 160 uygulama testi ve 27 gerçek D1/R2 testi başarılı; TypeScript,
ESLint, üretim build ve schema/snapshot kontrolü başarılı; npm audit açık sayısı 0.
Derlenmiş yerel Worker'ın 13 salt okunur kabul kontrolü geçti. Gerçek tarayıcıda
tek görünür H1, 5 SSR SSS yanıtı, JSON-LD graph, satılmış araç başlığı/SoldOut ve
BreadcrumbList doğrulandı. 390 px mobil hedef görünümde yatay taşma veya kırık
görünür görsel yoktu. Canlı kabul ve CI bağlantıları PR/yayın sonucunda raporlanır.

1. **Sahip bilgisi gerekli:** Kesin adres/harita ve kullanılacak e-posta/sosyal
   hesaplar panelden güncellenmeli. Bunlar Google Business Profile dahil bütün
   işletme kayıtlarıyla tutarlı olmalı; mevcut Nilüfer adresi doğrulanmış Etiler
   adresi sayılmaz. Mevcut ekspertiz/teslimat/ithalat iddiaları da işletmece
   teyit edilmeli; bu denetim ticari iddiaları bağımsız doğrulamaz.
2. **Hesap erişimi gerekli:** Search Console domain mülkü DNS ile doğrulanmalı,
   `https://bycaretiler.com/sitemap.xml` gönderilmeli, ana sayfa ve örnek araç için
   URL denetimi çalıştırılmalı. Bing Webmaster Tools mülkü de eklenmeli. Bunların
   hesabına erişim sağlanmadığından başvuru/indekslenme yapıldı diye raporlanmaz.
3. **Ölçüm gerekli:** Search Console sorgu/tıklama ve indeks kapsamı, gerçek
   kullanıcı Core Web Vitals ve PageSpeed saha verileri izlenmeli. Bu çalışma
   arama sıralaması, AI alıntısı veya geçmiş trafik artışı ölçmez.
4. **İçerik geliştirme:** Kendi araçlarına ait doğrulanmış ekspertiz, orijinal
   fotoğraf ve model bazlı özgün açıklamalar kullanılmalı. Çok sayıda benzer
   şehir/marka sayfası veya otomatik SEO yazısı üretilmemeli.

## Birincil kaynaklar

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [OpenAI: Overview of crawlers](https://developers.openai.com/api/docs/bots)
- [Google: Vehicle Listing rich result desteğinin kaldırılması](https://developers.google.com/search/blog/2025/06/simplifying-search-results)
- [Cloudflare: Worker domain bağlama API'si](https://developers.cloudflare.com/api/resources/workers/subresources/domains/methods/update/)
