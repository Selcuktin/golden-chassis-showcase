import ferrari from "@/assets/car-ferrari.jpg";
import rolls from "@/assets/car-rolls.jpg";
import lambo from "@/assets/car-lambo.jpg";
import hero from "@/assets/hero.jpg";

export const PHONE = "+90 540 061 16 34";
export const PHONE_RAW = "905400611634";
export const INSTAGRAM = "https://instagram.com/bycar.eu";

export const waLink = (car?: string) =>
  `https://wa.me/${PHONE_RAW}?text=${encodeURIComponent(
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
  gear: "Otomatik" | "Manuel";
  body: "Coupe" | "SUV" | "Sedan" | "Cabrio";
  sold?: boolean;
  images: string[];
  specs: { power: string; color: string; package: string; expertise: string; tramer: string };
};

export const BRANDS = ["Ferrari", "Lamborghini", "Rolls-Royce", "Bentley", "Porsche", "Mercedes-AMG", "BMW M", "Audi RS"];

export const CARS: Car[] = [
  { id: "sf90", brand: "Ferrari", title: "Ferrari SF90 Stradale", year: 2023, km: 4500, fuel: "Hibrit", gear: "Otomatik", body: "Coupe", images: [ferrari, hero, lambo], specs: { power: "1000 HP", color: "Rosso Corsa", package: "Assetto Fiorano", expertise: "Orijinal / Hatasız", tramer: "Yok" } },
  { id: "ghost", brand: "Rolls-Royce", title: "Rolls-Royce Ghost Black Badge", year: 2024, km: 1200, fuel: "Benzin", gear: "Otomatik", body: "Sedan", images: [rolls, hero, ferrari], specs: { power: "600 HP", color: "Black Diamond", package: "Black Badge Bespoke", expertise: "Orijinal / Hatasız", tramer: "Yok" } },
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
    founderText: "2020 yılından bu yana otomotiv sektöründe edindiği deneyim ve otomobillere duyduğu tutkuyla Burak Yılmaz, ByCar markasının temellerini atmıştır. ByCar; Mercedes-Benz, BMW, Porsche, Ferrari, Lamborghini, Bentley ve Rolls-Royce gibi dünyanın prestijli markalarını seçkin müşterileriyle buluşturan, uluslararası bir otomobil deneyimidir. BYCAR — Luxury Without Borders.",
    importTitle: "Özel Araç İthalatı",
    importSub: "Koleksiyonumuzda olmayan aracı sizin için dünyanın her yerinden getiriyoruz.",
    f: { model: "Marka & Model", year: "Tercih Edilen Model Yılı", budget: "Bütçe", country: "Menşei Ülke", name: "Ad Soyad", phone: "Telefon", offer: "Teklifiniz / Mesajınız" },
    faq: "SSS", privacy: "KVKK ve Gizlilik Politikası",
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
    founderText: "With experience in the automotive industry since 2020 and a passion for automobiles, Burak Yılmaz founded ByCar. ByCar is an international automotive experience connecting distinguished clients with the world's most prestigious marques — Mercedes-Benz, BMW, Porsche, Ferrari, Lamborghini, Bentley and Rolls-Royce. BYCAR — Luxury Without Borders.",
    importTitle: "Private Vehicle Import",
    importSub: "Not in our collection? We source it for you from anywhere in the world.",
    f: { model: "Make & Model", year: "Preferred Model Year", budget: "Budget", country: "Country of Origin", name: "Full Name", phone: "Phone", offer: "Your Offer / Message" },
    faq: "FAQ", privacy: "Privacy Policy",
  },
};
export type Lang = keyof typeof T;
