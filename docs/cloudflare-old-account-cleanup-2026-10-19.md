# Eski ByCar kaynaklarının temizliği — 19 Ekim 2026

Kullanıcı tam aktarım sonrası, eski hesapta yer kaplayan ByCar Worker/D1/R2
kopyalarını silmemizi açıkça istedi. Bu talep önceki en az yedi gün bekleme
planını değiştirdi. Eski kaynaklar artık uzaktan rollback hedefi değildir;
doğrulanmış özel yerel yedeklerden geri yükleme gerekir.

## Silinen kaynaklar

Yalnız eski hesap `371caa7e632e84151d1de536dc76b2e1` üzerinde:

| Kaynak | Kimlik | İşlem |
| --- | --- | --- |
| Worker | `selcuktin-golden-chassis-showcase` | Silindi; önceden route/custom domain/storage binding/preview yoktu. |
| D1 | `bycar_db`, `cb9bbc34-a9ef-446e-b993-46405a7ca765` | Silindi; raporlanan alan 233.472 byte. |
| R2 | `bycar-media` | Üç eski nesne (3.990.237 byte) ve boşalan bucket silindi. |

Eski hesap, Moved Away DNS zone'u ve diğer projeler silinmedi. Sam ve Çözüm
D1 kimlikleri, Pages üretim/preview bağlantıları ve Çözüm backup bucket'ı korundu.
Diğer Workers/Pages kaynaklarının ayarları da silme öncesi/sonrası karşılaştırıldı.

## Silmeden önceki kapılar

- İki hesapta tüm listelenen Workers ve Pages üretim/preview binding'leri okundu;
  eski ByCar D1/bucket'ını kullanan başka uygulama bulunmadı.
- Yeni Worker doğrudan yeni D1 `8b964994-5695-49da-9923-64ca43dfa8cf` ve yeni
  `bycar-media` bucket'ına bağlı; eski hesaba service binding yok.
- Eski ve güncel yeni D1 için taze tam SQL export'ları alındı. Her iki yedek,
  aynı migration'larla kurulmuş ayrı gerçek yerel workerd/D1 ortamına restore
  edildi. Dokuz tablonun satır sayısı ve içerik hash'leri birebir eşleşti;
  quick_check ok, foreign_key_check 0 ihlal. Üretimde test kaydı oluşturulmadı.
- Üç R2 dosyasının gerçek byte'ları yerel `.bin` dosyalarında saklandı.
  Özgün key, HTTP/custom metadata ve SHA-256 manifesti birlikte korundu;
  yerel disk, eski kaynak ve yeni hedefte içerik eşitliği kontrol edildi.
- Hassas SQL ve dosya yedekleri Git dışındaki `.wrangler/cleanup/backups/`
  dizininde özel Windows ACL ile tutulur; PR'a/rapora secret veya müşteri
  içeriği eklenmedi. Manifest tek başına dosya yedeği sayılmadı.

## Silme sonrası kontroller

- Eski ByCar Worker, D1 ID ve R2 bucket'ı kaynak hesabın envanterinde yok.
- Yeni hesabın kaynak listesi ve binding'leri değişmedi; hedefte 13 araç,
  84 görsel satırı ve mevcut admin kaydı korunuyor.
- Diğer projelerin envanteri ve binding'leri silme öncesiyle aynı.
  Eski hesapta `sami-app-db`, `inegol-cozum-db` ve `inegol-cozum-backups` kalır.
- ByCar: health ok / D1 true / R2 true; 76 salt okunur canlı kontrol, 0 hata.
  Sam ve Çözüm ana sayfaları 200; oturumsuz özel API'leri 401/no-store.
- DNS, iki public resolver ve iki yeni yetkili nameserver üzerinden doğrulandı.
  İlk yerel kontrolün geçici ENOTFOUND sonucu tekrar sorguda düzelmişti;
  yetkili DNS ve yeni uygulama bu sırada sağlıklıydı.

Kontrol komutunun varsayılanı artık eski workers.dev yerine bycaretiler.com'dur.
ESLint, Git dışındaki yerel `.wrangler/` operasyon dosyalarını taramaz;
uygulama kaynaklarının kuralları değiştirilmedi.

Bu işlem kullanılan saklama alanını ve eski kaynak sayısını azaltır; gün içinde
önceden tüketilmiş D1 rows_read/rows_written sayacını sıfırlamaz. Yeni hesabın
Free limitleri ve yeni üretim verileri üzerinde temizlik yapılmadı.

## Kurtarma sınırı

Güncel yeni hedefi düzeltmek/geri almak için yeni hesabın uygun Worker sürümü ve
güncel D1/R2 yedeği kullanılır. Eski hesap artık hazır rollback değildir.
Yedekten restore gerekirse farklı, boş bir DB/bucket hazırlanır; yeni üretim
kayıtları eski snapshot ile ezilmez. Yerel yedek dizinini silmeyin; günlük R2
yedek otomasyonu bu temizlik kapsamında oluşturulmadı.
