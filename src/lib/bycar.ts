import ferrari from "@/assets/car-ferrari.jpg";
import rolls from "@/assets/car-rolls.jpg";
import lambo from "@/assets/car-lambo.jpg";
import hero from "@/assets/hero.jpg";

export const PHONE = "+90 540 061 16 34";
export const PHONE_RAW = "905400611634";
export const INSTAGRAM = "https://instagram.com/bycar.eu";

export const waLink = (car?: string, raw: string = PHONE_RAW) =>
  `https://wa.me/${raw}?text=${encodeURIComponent(
    car
      ? `Merhaba, web sitenizdeki ${car} için fiyat teklifi almak istiyorum.`
      : "Merhaba, ByCar VIP hizmetleri hakkında bilgi almak istiyorum.",
  )}`;

export type Car = {
  id: string;
  brand: string;
  title: string;
  year: number;
  km: number;
  fuel: "Benzin" | "Hibrit" | "Elektrik" | "Dizel";
  gear: "Otomatik" | "F1/PDK" | "Manuel";
  body: "Coupe" | "SUV" | "Sedan" | "Cabrio";
  sold?: boolean;
  status?: "Satışta" | "Satıldı" | "Taslak";
  featured?: boolean;
  extras?: string[];
  video?: string;
  images: string[];
  specs: { power: string; color: string; package: string; expertise: string; tramer: string };
};

export const BRANDS = ["Ferrari", "Lamborghini", "Rolls-Royce", "Bentley", "Porsche", "Mercedes-AMG", "BMW M", "Audi RS"];

export const CARS: Car[] = [
  { id: "sf90", featured: true, extras: ["Karbon seramik frenler", "Assetto Fiorano süspansiyon", "Yolcu ekranı", "JBL Premium ses sistemi"], brand: "Ferrari", title: "Ferrari SF90 Stradale", year: 2023, km: 4500, fuel: "Hibrit", gear: "Otomatik", body: "Coupe", images: [ferrari, hero, lambo], specs: { power: "1000 HP", color: "Rosso Corsa", package: "Assetto Fiorano", expertise: "Orijinal / Hatasız", tramer: "Yok" } },
  { id: "ghost", extras: ["Starlight tavan", "Arka koltuk eğlence sistemi", "Bespoke ses sistemi", "Masaj koltuklar"], brand: "Rolls-Royce", title: "Rolls-Royce Ghost Black Badge", year: 2024, km: 1200, fuel: "Benzin", gear: "Otomatik", body: "Sedan", images: [rolls, hero, ferrari], specs: { power: "600 HP", color: "Black Diamond", package: "Black Badge Bespoke", expertise: "Orijinal / Hatasız", tramer: "Yok" } },
  { id: "urus", brand: "Lamborghini", title: "Lamborghini Urus Performante", year: 2023, km: 8900, fuel: "Benzin", gear: "Otomatik", body: "SUV", images: [lambo, hero, rolls], specs: { power: "666 HP", color: "Verde Gea Matt", package: "Performante Carbon", expertise: "Orijinal / Hatasız", tramer: "Yok" } },
  { id: "hyper", brand: "Porsche", title: "Porsche 911 GT2 RS Weissach", year: 2022, km: 3200, fuel: "Benzin", gear: "Otomatik", body: "Coupe", images: [hero, ferrari, lambo], specs: { power: "700 HP", color: "Jet Black", package: "Weissach Package", expertise: "Orijinal / Hatasız", tramer: "Yok" } },
  { id: "f8", brand: "Ferrari", title: "Ferrari 812 Competizione", year: 2022, km: 2100, fuel: "Benzin", gear: "Otomatik", body: "Coupe", sold: true, images: [ferrari, hero], specs: { power: "830 HP", color: "Rosso Fuoco", package: "Carbon Pack", expertise: "Orijinal", tramer: "Yok" } },
  { id: "cullinan", brand: "Rolls-Royce", title: "Rolls-Royce Cullinan Black Badge", year: 2023, km: 5600, fuel: "Benzin", gear: "Otomatik", body: "SUV", images: [rolls, hero], specs: { power: "600 HP", color: "Obsidian", package: "Black Badge", expertise: "Orijinal / Hatasız", tramer: "Yok" } },
];

export const T = {
  tr: {
    nav: ["Koleksiyon", "Özel İthalat", "İthalat Süreci", "Kurucumuz", "İletişim"],
    heroTitle: "Lüksün Yeni Adresi.",
    heroSub: "Dünyanın en seçkin otomobilleri, sizin için.",
    explore: "Koleksiyonu Keşfet",
    importReq: "Özel İthalat Talebi",
    collection: "Koleksiyon",
    search: "Ara: Taycan, SF90, Ghost…",
    all: "Tümü",
    quote: "Fiyat Teklifi Al",
    sold: "SATILDI",
    waQuote: "WhatsApp ile Teklif Al",
    call: "Hemen Arayın",
    form: "Hızlı Teklif Formu",
    send: "Talebi İlet",
    sent: "Talebiniz iletildi. VIP danışmanımız sizinle iletişime geçecek.",
    process: "İthalat Süreci",
    steps: [["Talep & Pazar Analizi", "Hayalinizdeki aracı küresel pazarda analiz ediyoruz."], ["Tedarik & Uluslararası Ekspertiz", "Bağımsız ekspertiz ile güvenle tedarik."], ["Gümrük & Kapalı Lojistik", "Kapalı taşıma ve tüm gümrük işlemleri."], ["Anahtar Teslim VIP Teslimat", "Aracınız kapınızda, anahtar elinizde."]],
    founder: "Kurucumuzun Vizyonu",
    founderText: "ByCar, otomobil tutkusunu uluslararası bir vizyonla buluşturmak amacıyla kurulmuştur. Markamızın kurucusu Burak Yılmaz, otomobil dünyasına duyduğu ilgi ve girişimci bakış açısıyla ByCar’ı premium ve ultra lüks otomobil sektöründe güçlü bir marka haline getirmeyi hedeflemektedir. Mercedes-Benz, BMW, Porsche, Ferrari, Lamborghini, Bentley ve Rolls-Royce gibi dünyanın önde gelen otomobil markalarını müşterilerle buluşturmayı amaçlayan ByCar, yalnızca araç satışına değil, kişiye özel bir otomobil deneyimi sunmaya odaklanmaktadır. Kurucumuzun vizyonu, coğrafi sınırların ötesine geçen, güven ve profesyonellik üzerine inşa edilmiş uluslararası bir otomobil markası oluşturmaktır. ByCar için lüks, yalnızca bir otomobile sahip olmak değil; ayrıcalıklı bir deneyimin parçası olmaktır. BYCAR — Luxury Without Borders.",
    importTitle: "Özel Araç İthalatı",
    importSub: "Koleksiyonumuzda olmayan aracı sizin için dünyanın her yerinden getiriyoruz.",
    f: { model: "Marka & Model", year: "Tercih Edilen Model Yılı", budget: "Bütçe", country: "Menşei Ülke", name: "Ad Soyad", phone: "Telefon", offer: "Teklifiniz / Mesajınız" },
    faq: "SSS", privacy: "KVKK ve Gizlilik Politikası", extras: "Donanım & Ekstralar", faqTitle: "Sıkça Sorulan Sorular",
    faqs: [["Fiyatları neden sitede göremiyorum?", "Her araç kişiye özel değerlendirilir. Güncel fiyat ve koşullar için WhatsApp veya telefonla VIP danışmanımıza ulaşabilirsiniz."], ["Özel ithalat ne kadar sürer?", "Aracın bulunduğu ülkeye ve gümrük sürecine bağlı olarak genellikle 3–8 hafta arasında anahtar teslim yapılır."], ["Araçlar ekspertizden geçiyor mu?", "Evet. Tüm araçlar bağımsız, uluslararası ekspertiz firmalarınca kontrol edilir ve rapor sizinle paylaşılır."], ["Takas veya finansman imkânı var mı?", "Aracınızı değerlendirmeye alabilir, size uygun ödeme seçenekleri için çözüm ortaklarımızla çalışabiliriz."], ["Teslimat nasıl yapılır?", "Araçlar kapalı taşıyıcılarla, sigortalı şekilde adresinize teslim edilir."]],
    privacyText: "ByCar olarak kişisel verilerinizin güvenliğine önem veriyoruz. Formlar aracılığıyla paylaştığınız ad, telefon ve talep bilgileri yalnızca size dönüş yapmak ve hizmet sunmak amacıyla, 6698 sayılı KVKK kapsamında işlenir. Bilgileriniz üçüncü kişilerle pazarlama amacıyla paylaşılmaz. Verilerinize erişme, düzeltme veya silinmesini talep etme hakkına sahipsiniz; bunun için bizimle WhatsApp veya telefon üzerinden iletişime geçebilirsiniz.",
  },
  en: {
    nav: ["Collection", "Private Import", "Import Process", "Founder", "Contact"],
    heroTitle: "The New Address of Luxury.",
    heroSub: "The world's most exceptional automobiles, for you.",
    explore: "Explore the Collection",
    importReq: "Private Import Request",
    collection: "Collection",
    search: "Search: Taycan, SF90, Ghost…",
    all: "All",
    quote: "Request a Quote",
    sold: "SOLD",
    waQuote: "Get a Quote on WhatsApp",
    call: "Call Now",
    form: "Quick Offer Form",
    send: "Send Request",
    sent: "Your request has been sent. Our VIP advisor will contact you.",
    process: "Import Process",
    steps: [["Request & Market Analysis", "We analyse the global market for your dream car."], ["Sourcing & International Inspection", "Secure sourcing with independent inspection."], ["Customs & Enclosed Logistics", "Enclosed transport and full customs handling."], ["Turnkey VIP Delivery", "Your car at your door, keys in hand."]],
    founder: "Our Founder's Vision",
    founderText: "ByCar was founded to bring the passion for automobiles together with an international vision. Our founder, Burak Yılmaz, driven by his fascination with the automotive world and an entrepreneurial outlook, aims to make ByCar a powerful brand in the premium and ultra-luxury automotive sector. Bringing the world's leading marques — Mercedes-Benz, BMW, Porsche, Ferrari, Lamborghini, Bentley and Rolls-Royce — to its clients, ByCar focuses not merely on selling cars but on delivering a bespoke automotive experience. Our founder's vision is to build an international automotive brand that reaches beyond geographic borders, built on trust and professionalism. For ByCar, luxury is not simply owning a car; it is being part of an exclusive experience. BYCAR — Luxury Without Borders.",
    importTitle: "Private Vehicle Import",
    importSub: "Not in our collection? We source it for you from anywhere in the world.",
    f: { model: "Make & Model", year: "Preferred Model Year", budget: "Budget", country: "Country of Origin", name: "Full Name", phone: "Phone", offer: "Your Offer / Message" },
    faq: "FAQ", privacy: "Privacy Policy", extras: "Equipment & Extras", faqTitle: "Frequently Asked Questions",
    faqs: [["Why aren't prices shown on the site?", "Each vehicle is evaluated individually. Contact our VIP advisor via WhatsApp or phone for current pricing and terms."], ["How long does a private import take?", "Depending on the origin country and customs, turnkey delivery usually takes 3–8 weeks."], ["Are vehicles inspected?", "Yes. Every vehicle is checked by independent international inspection firms and the report is shared with you."], ["Do you offer trade-in or financing?", "We can evaluate your current car and work with partners to find suitable payment options."], ["How is delivery handled?", "Vehicles are delivered to your address by insured, enclosed transport."]],
    privacyText: "At ByCar we take the security of your personal data seriously. The name, phone and request details you share through our forms are processed solely to respond to you and provide our services, in line with Turkish data protection law (KVKK). Your data is never shared with third parties for marketing. You may request access, correction or deletion of your data at any time by contacting us via WhatsApp or phone.",
  },
};
export type Lang = keyof typeof T;
