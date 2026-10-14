# Mimari inceleme — 14 Ekim 2026

İncelenen temel commit: `0a08ae7`; özellikle `357d6ca`, `fb7e304`, `6c7624a`,
`b30902a` ve önceki CMS atomiklik düzenlemeleri. Bu değerlendirme kaynak kodu,
commit farkları ve yerel testlere dayanır; canlı D1 şeması veya üretim logları incelenmedi.

## Bu PR'ın giderdiği temel neden

Şema iki ayrı yerde tanımlanıyordu: `schema.sql` ve `api.ts` içindeki
`D1_SCHEMA_STATEMENTS`. `ensureD1Tables` SQL hatalarını yutuyor, başarısız olsa bile
isolate genelindeki tek `d1Initialized` bayrağını başarılı sayıyordu. Üstelik
`CREATE TABLE IF NOT EXISTS`, mevcut tablodaki bir kolona sonradan `NOT NULL`
eklemiyordu. Kaynak dosyasını değiştirmek canlı şemayı değiştirmek anlamına gelmiyordu.
`fb7e304` içindeki admin kolon düzeltmesi ve `357d6ca` içindeki NULL anahtar
korumaları, bu farkın neden tekrar tekrar sorun ürettiğini gösteriyor.

Bu PR tek Drizzle şeması, sıralı Wrangler migration'ları, gerçek eski-veri geçiş
testi ve CI ekler. API'den DDL tamamen kaldırılır. Veritabanı satır tipleri Drizzle
şemasından türetilir; settings okumaları Drizzle istemcisini kullanır. Mevcut
parametreli CMS/CAS batch SQL'i korunur: D1 atomik batch davranışını geniş bir ORM
yeniden yazımıyla değiştirmek bu geçişin kapsamı değildir.

Başlangıçta 59 test geçiyordu; lint, son eklenen SQLite testindeki dört Prettier
hatasıyla duruyordu. Dolayısıyla yalnızca testlerin geçmesi, tüm kalite kapılarının
geçtiğini göstermiyordu. CI artık bunları ayrı kontrol eder; şema değişip migration
unutulursa da hata verir. Drizzle Kit'in eski yardımcı bağımlılığından gelen esbuild
açığı yalnızca o alt bağımlılığa uygulanan override ile giderildi; generation ve
testlerle doğrulandı.

## Bağımsız denetim sonrası seed düzeltmesi

Env girişindeki `ON CONFLICT DO NOTHING`, panelde değiştirilmiş parolayı korur;
ancak eski seed hesabını kendiliğinden geçersiz kılamaz. Bu durum gerçek yerel D1'de
yeniden üretildi. `0002_revoke_legacy_seed_admin.sql`, yalnızca eski salt işaretli
hesapları ve bağlı oturumlarını kaldırır. Env ile yeniden oluşturulan `admin-master`
kimliği eski oturumları canlandıramaz; farklı salt'lı hesaplar ve değiştirilen
parolalar korunur. Bu bir veri onarımıdır; yeni auth algoritması eklenmez.

Canlı D1'de salt/hash değerlerini paylaşmadan yapılan sayımda eski seed hesabı ve
bağlı oturum sayısı sıfır bulundu. Yine de eski veritabanlarından geçiş için bu
migration gereklidir. Node 24 gereksinimi `engines` ve `.nvmrc` ile belirtildi;
testlerin bir bölümü `node:sqlite` kullandığı için Node 22 doğrulaması yeterli değildir.

## Sonraki işler: ayrı ve dar kapsamlı PR'lar

Cloudflare Access ayrı takip PR'ında yönetim paneli/API yollarına eklenmiştir.
Paylaşılan CMS URL'sindeki yönetici istekleri de `jose` ile doğrulanan Access JWT'si
gerektirir; herkese açık katalog erişimi korunur. Bu katman, aşağıdaki mevcut
oturum iptali davranışının düzeltilmesinin yerini almaz.

1. **Oturum sonlandırmanın hata davranışı:** logout ve şifre değişiminde D1 session
   silme hataları yakalanıp başarılı yanıt verilebiliyor. D1 yetkili kaynak olduğundan
   silinemeyen oturum geçerliliğini koruyabilir. D1 hatasında başarılı çıkış bildirmeyen
   davranışı ve gerçek D1 hata testlerini ayrı bir auth çalışmasında ele alın.
2. **Auth sahipliği:** PBKDF2, token üretimi, oturum, env ile acil giriş ve rate limit
   `api.ts` içinde özel olarak geliştirilmiş. Bakımı yapılan bir kimlik sağlayıcısı
   veya auth kütüphanesine geçişi ayrı tasarlayın; mevcut oturumların sonlandırılması,
   yönetici erişimi ve env fallback davranışı için açık bir geçiş planı hazırlayın.
   Bu PR yeni auth mantığı eklemez; AGENTS kuralları yeni elle yazılmış auth'u engeller.
3. **API sorumluluklarını ayırma:** aynı büyük modül katalog, CRM, CMS, auth, medya ve
   GC yönetiyor. Davranışı değiştirmeyen küçük PR'larla önce repository/query katmanını,
   sonra servis ve route katmanlarını ayırın. Her adımda mevcut sözleşme testlerini koruyun.
4. **D1–R2 işlem sınırı:** iki servis arasında ortak transaction yok. Kuyruk ve tekrar
   deneme yaklaşımı korunmalı; sonraki çalışma R2 silme hatası ve yeniden deneme
   senaryolarını gerçek bağlamalar üzerinde genişletmeli. CMS'deki batch parçalama
   dalı da tek batch atomiklik garantisiyle karıştırılmamalı.
5. **Merge kapısı:** workflow eklemek tek başına `main` korumasını açmaz. GitHub ruleset
   içinde `quality` ve `audit` kontrollerini zorunlu yapın; doğrudan push'u kapatın.

Önerilen sıra: bu migration/CI PR'ı → oturum iptali davranışı ve auth geçiş tasarımı
→ davranışı koruyan modül ayrımı → R2 hata/tekrar-deneme kapsamı. Her turda yalnızca
tek sorumluluk alanı değişsin; yeni bir genel güvenlik prompt'uyla tüm sistemi yeniden
yazmak yerine somut hata, kabul ölçütü ve ilgili gerçek-bağlama testi tanımlansın.
