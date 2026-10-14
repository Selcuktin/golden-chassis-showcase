# Son işlev ve yayın denetimi — 14 Ekim 2026

İncelenen başlangıç sürümü: `d7b9eee` (PR #17 dahil). İş modeli: fiyatsız araç
vitrini, satılmış araç arşivi, WhatsApp danışmanlığı ve D1 üzerinde teklif/ithalat
talepleri. Ödeme, otomatik e-posta bildirimi veya stok satış işlemi yoktur.

## Sonuç ve bu turda giderilen hatalar

Otomatik kontrollerin geçmesi tek başına fotoğraf yüklemesinin çalıştığını
kanıtlamıyordu. Üretimle aynı CSP başlıklarını kullanan derlenmiş yerel Worker'da
gerçek PNG seçildiğinde yükleme `Failed to fetch` ile durdu: WebP dönüşümü sonrası
`fetch(data:...)`, `connect-src 'self'` tarafından engelleniyordu. Bu hata tarayıcıda
yeniden üretildi; API bir yükleme isteği bile almıyordu.

Canvas artık `toBlob` ile doğrudan yüklenebilir WebP üretir; base64 adresi tekrar
fetch edilmez. Geçici object URL başarı/hata durumunda temizlenir. WebP üretemeyen
tarayıcıda orijinal dosya, gerçek MIME ve uzantısıyla kullanılır. Güvenlik politikası
gevşetilmemiştir. Dikey fotoğraflarda da uzun kenar en fazla 1600 px olur; küçük
fotoğraflar büyütülmez. Kalite 0.82'dir.

Fotoğraf yüklemesi sürerken başka araç açma/form sıfırlama sonucunda eski yanıtın
yeni forma eklenmesi engellendi. Aynı anda iki fotoğraf yükleme grubu başlatılmaz.
Bir dosya okunamazsa diğer başarılı fotoğraflar korunur, kullanıcıya dosya adıyla
hata gösterilir. Eklenen fotoğraflar kaydedilmemiş değişiklik olarak işaretlenir.

## Doğrulama matrisi

| Alan                    | Kanıt                                                                                                                    | Sonuç                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kod ve bağımlılıklar    | TypeScript, ESLint, üretim build, npm audit                                                                              | Başarılı; bilinen bağımlılık açığı 0                                                                                                                 |
| Uygulama                | 156 Vitest testi                                                                                                         | Başarılı; fotoğraf/CSP, dikey boyut, fallback MIME, geç yanıt ve kısmi hata testleri dahil                                                           |
| D1/R2                   | 24 gerçek yerel Wrangler/workerd testi                                                                                   | Migration, eski veri yükseltmesi, constraint, CAS/force yarışları, rollback, CRM, oturum iptali, GC/retry, video/range ve yükleme sınırları başarılı |
| Gerçek fotoğraf yükleme | Derlenmiş yerel panelde PNG ve JPG seçildi, WebP galeriye eklendi, panelden D1'e kaydedildi, genel API'den tekrar okundu | Her iki nesnede HTTP 200, `image/webp` ve RIFF/WEBP imzası doğrulandı                                                                                |
| Ölçülen PNG             | 83.202 bayt kaynak → 11.432 bayt WebP                                                                                    | Yaklaşık %86 daha küçük; her fotoğraf için aynı oran garanti edilmez                                                                                 |
| Katalog/erişim          | Canlı `check:site` ile 76 salt okunur kontrol                                                                            | 9 genel ilan, 58 medya yolu, 404, asset türleri, canonical, sitemap/robots, parola formu ve anonim özel API reddi başarılı                           |
| Canlı D1                | `quick_check`, `foreign_key_check`, migration geçmişi ve özet sayımlar                                                   | Bütünlük temiz, 0000–0003 uygulanmış; eski seed/NULL ayar/bozuk JSON yok                                                                             |
| Mobil                   | Gerçek tarayıcıda 390 px hedef görünüm, menü, TR/EN ve yüklenen görseller                                                | Yatay taşma veya kırık görünür görsel yok; menü ve dil geçişi çalışıyor                                                                              |
| Yapılandırılmış veri    | İşlenmiş DOM'daki JSON-LD okundu                                                                                         | AutoDealer ve 9 yayınlanmış araç mevcut; taslaklar yok                                                                                               |

Canlı sayım: 8 aktif + 1 satılmış + 4 taslak araç, 84 görsel kaydı ve 2 müşteri
talebi. Müşteri içeriği, oturum token'ı, parola hash/salt veya API anahtarı rapora
alınmadı. Bütün yazma/silme/şifre değiştirme ve hata oluşturma testleri üretimden
ayrı yerel DB/R2 üzerinde yapıldı. Bu turda migration veya canlı veri onarımı yok.

## Yayın kabulünde kalanlar

- Satın alınacak domain, DNS/TLS, Worker custom domain ve ardından `SITE_URL`.
- Canlı sayfada hâlâ Fethiye Bulvarı No:42/Nilüfer adresi var; sahibinin verdiği
  Etiler bilgisine uygun gerçek adres ve harita panelden girilmeli.
- `info@bycarglobal.com` kullanılacaksa posta hizmeti ve posta kutusu doğrulanmalı.
- Dönüşüm yeni bilgisayar yüklemelerine uygulanır. Mevcut JPG/PNG dosyaları ve
  elle girilmiş harici görsel URL'leri otomatik olarak yeniden yazılmaz.
- İngilizce arayüz bir dil düğmesidir; ayrı `/en/` URL'leri ve uluslararası SEO
  yayını bu kapsamda kurulmadı. Search Console indeksleme ve gerçek kullanıcı
  Core Web Vitals verileri henüz doğrulanmış değildir.
- Mevcut parola/oturum sistemi korunur, Cloudflare Access kapalıdır. Mimari bakım
  önerileri için önceki inceleme geçerlidir; bu denetim yeni auth geliştirmez.

Bu sonuçlar test edilen sürüm ve senaryolar için kanıttır; gelecekteki değişiklikler,
sağlayıcı kesintileri veya bütün cihazlar için sıfır hata garantisi değildir.
