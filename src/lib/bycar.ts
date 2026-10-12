import { useEffect, useState } from "react";

export const PHONE = "+90 540 061 16 34";
export const PHONE_RAW = "905400611634";
export const INSTAGRAM = "https://instagram.com/bycar.eu";

export const waLink = (car?: string, customText?: string) =>
  `https://wa.me/${PHONE_RAW}?text=${encodeURIComponent(
    customText
      ? customText
      : car
        ? `Merhaba, web sitenizdeki ${car} için fiyat teklifi ve detaylı bilgi almak istiyorum.`
        : "Merhaba, ByCar VIP otomotiv hizmetleri hakkında bilgi almak istiyorum.",
  )}`;

export type CarStatus = "active" | "sold" | "draft";
export type ImageFit = "contain" | "cover";

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
  status?: CarStatus;
  featured?: boolean;
  imageFit?: ImageFit;
  video?: string;
  images: string[];
  specs: {
    power: string;
    color: string;
    package: string;
    expertise: string;
    tramer: string;
  };
  extras?: string[];
  extrasEn?: string[];
  description?: {
    tr: string;
    en: string;
  };
};

export type Inquiry = {
  id: string;
  type: "Teklif" | "İthalat";
  name: string;
  phone: string;
  car: string;
  offerOrBudget: string;
  details?: string;
  time: string;
  status: "Yeni" | "İletişime Geçildi" | "Tamamlandı";
};

export type SiteSettings = {
  showSearchFilter: boolean;
  showYearFilter: boolean;
  showBodyFilter: boolean;
  showFuelFilter: boolean;
  showGearFilter: boolean;
  showStatusFilter: boolean;
  filterPanelDefaultOpen: boolean;
  modalShowSpecsTab: boolean;
  modalShowExtrasTab: boolean;
  modalShowOfferTab: boolean;
  modalDefaultTab: "specs" | "extras" | "offer";
  defaultCardFit: ImageFit;
  whatsappAutoOpenOnForm: boolean;
  pinnedBrands: string[];
};

export const BRANDS = [
  "Cupra",
  "Audi",
  "Audi RS",
  "Ferrari",
  "Porsche",
  "Lamborghini",
  "Rolls-Royce",
  "Mercedes-AMG",
  "BMW M",
  "Bentley",
];

export const DEFAULT_SETTINGS: SiteSettings = {
  showSearchFilter: true,
  showYearFilter: true,
  showBodyFilter: true,
  showFuelFilter: true,
  showGearFilter: true,
  showStatusFilter: true,
  filterPanelDefaultOpen: true,
  modalShowSpecsTab: true,
  modalShowExtrasTab: true,
  modalShowOfferTab: true,
  modalDefaultTab: "specs",
  defaultCardFit: "cover",
  whatsappAutoOpenOnForm: true,
  pinnedBrands: BRANDS,
};

export const ADMIN_PRESETS = {
  brands: [
    "Cupra",
    "Audi",
    "Audi RS",
    "Ferrari",
    "Porsche",
    "Lamborghini",
    "Rolls-Royce",
    "Mercedes-AMG",
    "BMW M",
    "Bentley",
    "Aston Martin",
    "McLaren",
    "Range Rover",
    "Maserati",
    "Maybach",
  ],
  packages: [
    "Design Paket",
    "S-Line",
    "Competition M xDrive",
    "Weissach Package",
    "Assetto Fiorano / Carbon",
    "Grand Edition (1 of 1000)",
    "First Edition",
    "RS Performance Dynamic Plus",
    "Bespoke Starlight",
    "AMG Night Package",
    "Mulliner Bespoke",
  ],
  powers: [
    "150 HP (1.5 TSI ACT)",
    "116 HP (1.6 TDI S-Tronic)",
    "510 HP (4.0 Atmosferik Boxer)",
    "530 HP (3.0 M TwinPower Turbo)",
    "585 HP (4.0 V8 Biturbo)",
    "630 HP (4.0 V8 TFSI)",
    "782 HP (4.0 V8 Ultra Hybrid)",
    "800 HP (4.0 V8 Twin-Turbo PHEV)",
    "830 HP (3.0 V6 Plug-in Hybrid)",
  ],
  colors: [
    "Manyetik Gri / Bakır Detay",
    "Buzul Beyazı / Kontrast Gri",
    "Jet Siyah / Bordo Deri",
    "Nardo Gri / Valcona Deri",
    "Brooklyn Gri / Kyalami Turuncu",
    "Rosso Corsa / Nero Deri",
    "Oak Green Metallic Neo",
    "Grigio Titans (Mat Füme)",
    "MANUFAKTUR Gece Siyahı Magno / Altın",
    "Bespoke Çift Ton Bordo / Gümüş",
  ],
  expertises: [
    "Hatasız / Boyasız / Orijinal",
    "Tamamen Yetkili Servis Bakımlı",
    "Sıfır KM / Hatasız / Boyasız",
    "Hatasız / Boyasız / Bayi Çıkışlı",
    "Yetkili Bayi Orijinal Değişen / Harici Hatasız",
    "1 Parça Lokal Boyalı / Harici Hatasız",
  ],
  tramers: [
    "Yok",
    "Tramersiz (0 TL)",
    "Yetkili Servis Kayıtlı",
  ],
  extras: [
    { tr: "Açılabilir Panoramik Cam Tavan", en: "Panoramic Sliding Glass Sunroof" },
    { tr: "Bang & Olufsen 3D Premium Ses Sistemi", en: "Bang & Olufsen 3D Premium Sound System" },
    { tr: "Burmester 3D Surround Ses Sistemi", en: "Burmester 3D Surround Sound System" },
    { tr: "Karbon Seramik Fren Sistemi", en: "Carbon Ceramic Brake System" },
    { tr: "Ön Aks Yükseltme (Lift) Sistemi", en: "Front Axle Lift System" },
    { tr: "360° Çevre Görüş Kamerası & Park Asistanı", en: "360° Surround View Camera & Park Assist" },
    { tr: "Geri Görüş Kamerası & Ön-Arka Park Sensörü", en: "Rear View Camera & Front/Rear Park Sensors" },
    { tr: "Isıtmalı & Soğutmalı Ön Koltuklar", en: "Heated & Ventilated Front Seats" },
    { tr: "Elektrikli & Hafızalı Spor Koltuklar", en: "Power Adjustable & Memory Sport Seats" },
    { tr: "Masaj Fonksiyonlu Deri Koltuklar", en: "Massage Function Leather Seats" },
    { tr: "Isıtmalı Çok Fonksiyonlu Direksiyon", en: "Heated Multifunction Steering Wheel" },
    { tr: "Head-Up Display (Ön Cam Yansıtma)", en: "Head-Up Display (HUD)" },
    { tr: "Vakumlu Kapılar (Soft Close)", en: "Soft-Close Automatic Doors" },
    { tr: "Eller Serbest Elektrikli Bagaj Kapağı", en: "Hands-Free Power Tailgate" },
    { tr: "Anahtarsız Giriş ve Çalıştırma (Keyless-Go)", en: "Keyless Entry & Start System" },
    { tr: "Kablosuz Apple CarPlay & Android Auto", en: "Wireless Apple CarPlay & Android Auto" },
    { tr: "Kablosuz Şarj Ünitesi & Dijital Kokpit", en: "Wireless Charging & Digital Cockpit" },
    { tr: "Adaptif Hız Sabitleyici (ACC) & Şerit Takip", en: "Adaptive Cruise Control (ACC) & Lane Assist" },
    { tr: "Kör Nokta Uyarı & Çarpışma Önleme Sistemi", en: "Blind Spot Monitor & Collision Prevention" },
    { tr: "HD Matrix LED / Lazer Farlar & Kayar Stoplar", en: "HD Matrix LED / Laser Headlights & Dynamic Taillights" },
    { tr: "Karbon Fiber İç Trim & Direksiyon Paketi", en: "Carbon Fiber Interior Trim & Steering Package" },
    { tr: "Arka Aks Yönlendirme & Havalı Süspansiyon", en: "Rear-Axle Steering & Adaptive Air Suspension" },
    { tr: "Valfli Spor Egzoz Sistemi", en: "Switchable Sports Exhaust System" },
    { tr: "Çok Renkli Akıllı Ambiyans Aydınlatma", en: "Multi-Color Ambient Interior Lighting" },
  ],
};

const TERM_MAP_EN: Record<string, string> = {
  Benzin: "Petrol",
  Hibrit: "Hybrid",
  Elektrik: "Electric",
  Dizel: "Diesel",
  Otomatik: "Automatic",
  Manuel: "Manual",
  Yok: "None (Clean)",
  "Tramersiz (0 TL)": "Clean Record (0 TL)",
  "Yetkili Servis Kayıtlı": "Official Dealer Recorded",
  "Hatasız / Boyasız / Orijinal": "Accident-Free / Original Paint",
  "Hatasız / Boyasız / Değişensiz": "Accident-Free / Original Paint / No Replaced Parts",
  "Tamamen Yetkili Servis Bakımlı": "Full Official Dealer Service History",
  "Sıfır KM / Hatasız / Boyasız": "Zero KM / Brand New / Original Paint",
  "Hatasız / Boyasız / Bayi Çıkışlı": "Accident-Free / Official Dealer Delivered",
  "Hatasız / Boyasız / Borusan Çıkışlı": "Accident-Free / Official Borusan Delivered",
  "Hatasız / Boyasız / Koleksiyondan Teslim Edildi": "Accident-Free / Delivered from Collection",
  "Sağ Ön Kapı & Çamurluk Yetkili Bayi Orijinal Değişen / Harici Hatasız Boyasız":
    "Right Front Door & Fender Replaced at Official Audi Dealer / Otherwise Original Paint",
  "83.475 TL (Yetkili Servis Kayıtlı)": "83,475 TL (Official Audi Service Invoice)",
};

export function translateTerm(value: string, lang: Lang): string {
  if (lang === "tr" || !value) return value;
  if (TERM_MAP_EN[value]) return TERM_MAP_EN[value];
  const presetMatch = ADMIN_PRESETS.extras.find((e) => e.tr === value);
  if (presetMatch) return presetMatch.en;
  return value
    .replace(/Hatasız/gi, "Accident-Free")
    .replace(/Boyasız/gi, "Original Paint")
    .replace(/Orijinal/gi, "Original")
    .replace(/Yetkili Servis Bakımlı/gi, "Official Dealer Serviced")
    .replace(/Sıfır KM/gi, "Zero KM")
    .replace(/Yok/gi, "None")
    .replace(/Atmosferik/gi, "Naturally Aspirated")
    .replace(/Çıkışlı/gi, "Delivered");
}

export function autoGenerateEnglishDescription(
  title: string,
  brand: string,
  year: number,
  km: number,
  power: string,
  pkg: string,
  expertise: string,
): string {
  const kmText = km === 0 ? "zero kilometers (brand new)" : `${km.toLocaleString("en-US")} km`;
  return `${year} ${title} (${brand}) featuring ${power || "high-performance"} engine and ${pkg || "Exclusive"} specification with ${kmText}. Condition: ${translateTerm(expertise, "en")}. Available via ByCar Global VIP Concierge.`;
}

export const CARS: Car[] = [
  {
    id: "cupra-formentor-2023",
    brand: "Cupra",
    title: "Cupra Formentor 1.5 TSI ACT 150 HP DSG",
    year: 2023,
    km: 18500,
    fuel: "Benzin",
    gear: "Otomatik",
    body: "SUV",
    status: "active",
    featured: true,
    imageFit: "contain",
    video: "/cars/cupra/video.mp4",
    images: [
      "/cars/cupra/1.jpg",
      "/cars/cupra/2.jpg",
      "/cars/cupra/3.jpg",
      "/cars/cupra/4.jpg",
    ],
    specs: {
      power: "150 HP (1.5 TSI ACT)",
      color: "Manyetik Gri / Bakır Detay",
      package: "1.5 TSI ACT DSG + Ekstra Paket",
      expertise: "Hatasız / Boyasız / Değişensiz",
      tramer: "Yok",
    },
    extras: [
      "19\" 'Exclusive' Mat Siyah / Gümüş Alaşımlı Jantlar",
      "Bucket Tip Spor Koltuklar (Ekstra)",
      "Elektrikli Ayarlanabilir & Hafızalı Sürücü Koltuğu (Ekstra)",
      "Eller Serbest Elektrikli Bagaj Kapağı / Sanal Pedal (Ekstra)",
      "Geri Görüş Kamerası (Ekstra)",
      "İleri Sürüş Destek Paketi (Ekstra)",
      "Ön Park Sensörleri ve Otomatik Park Asistanı (Ekstra)",
      "Full LED Mercekli Ön Farlar & Infinite LED Arka Stoplar",
      "Çok Renkli Akıllı Ambiyans Aydınlatma",
      "Anahtarsız Giriş ve Çalıştırma Sistemi (Kessy)",
      "12\" Dokunmatik Multimedya & Dijital Gösterge Paneli",
      "Kablosuz Şarj Ünitesi & Kablosuz Full Link (Apple CarPlay / Android Auto)",
      "Üç Bölgeli Otomatik Klima (Climatronic)",
      "Açılabilir Panoramik Cam Tavan",
      "Isıtmalı Ön Koltuklar & Isıtmalı Çok Fonksiyonlu Deri Direksiyon",
      "Adaptif Hız Sabitleyici (ACC) & Ön Bölge Asistanı (Front Assist)",
      "Kör Nokta Tespit Sistemi, Şerit Takip ve Uzun Far Asistanı",
    ],
    extrasEn: [
      "19\" 'Exclusive' Matte Black / Silver Alloy Wheels",
      "Bucket Sport Seats (Factory Option)",
      "Power Adjustable & Memory Driver Seat (Factory Option)",
      "Hands-Free Power Tailgate / Virtual Pedal (Factory Option)",
      "Rear View Camera (Factory Option)",
      "Advanced Driver Assistance Package (Factory Option)",
      "Front Park Sensors & Automatic Park Assist (Factory Option)",
      "Full LED Lens Headlights & Infinite LED Taillights",
      "Multi-Color Smart Ambient Lighting",
      "Keyless Entry & Start System (Kessy)",
      "12\" Touchscreen Infotainment & Digital Cockpit",
      "Wireless Charger & Wireless Full Link (Apple CarPlay / Android Auto)",
      "Three-Zone Automatic Climate Control (Climatronic)",
      "Panoramic Sliding Glass Sunroof",
      "Heated Front Seats & Heated Multifunction Leather Steering Wheel",
      "Adaptive Cruise Control (ACC) & Front Assist",
      "Blind Spot Detection, Lane Assist & High Beam Assist",
    ],
    description: {
      tr: "ByCar (@bycar.eu) özel seçkisi. Fabrika çıkışlı ekstra opsiyon paketli (Bucket koltuklar, hafızalı elektrikli sürücü koltuğu, sanal pedallı elektrikli bagaj, ileri sürüş destek paketi). Ekspertiz garantili, hatasız ve boyasız kondisyonda.",
      en: "Exclusive ByCar (@bycar.eu) selection. Factory optioned with Bucket seats, memory power driver seat, hands-free power tailgate, and advanced driver assistance package. Accident-free and original paint.",
    },
  },
  {
    id: "audi-q2-design-2016",
    brand: "Audi",
    title: "Audi Q2 1.6 TDI Design S-Tronic",
    year: 2016,
    km: 199000,
    fuel: "Dizel",
    gear: "Otomatik",
    body: "SUV",
    status: "active",
    featured: true,
    imageFit: "cover",
    images: [
      "/cars/audi-q2/1.jpg",
      "/cars/audi-q2/2.jpg",
      "/cars/audi-q2/3.jpg",
      "/cars/audi-q2/4.jpg",
      "/cars/audi-q2/5.jpg",
      "/cars/audi-q2/6.jpg",
      "/cars/audi-q2/7.jpg",
      "/cars/audi-q2/8.jpg",
    ],
    specs: {
      power: "116 HP (1.6 TDI S-Tronic)",
      color: "Buzul Beyazı / Kontrast Gri",
      package: "Design Paket (Yetkili Servis Bakımlı)",
      expertise: "Sağ Ön Kapı & Çamurluk Yetkili Bayi Orijinal Değişen / Harici Hatasız Boyasız",
      tramer: "83.475 TL (Yetkili Servis Kayıtlı)",
    },
    extras: [
      "Tamamen Audi Yetkili Servis Bakımlı (2017 Çıkışlı)",
      "Audi Drive Select — Sport Sürüş Modu",
      "Xenon Far Sistemi & Kayar Arka LED Stoplar",
      "Geri Görüş Kamerası & Ön-Arka Park Sensörü",
      "Hız Sabitleme ve Limitleme Sistemi (Cruise Control)",
      "Bluetooth / USB / MMI Multimedya Ekranı",
      "Elektrikli Isıtmalı Yan Aynalar & Çift Bölgeli Dijital Klima",
      "Triger Seti, Şanzıman Yağı ve Güçlendirilmiş Mekatronik Tüpü Yeni",
    ],
    extrasEn: [
      "Full Official Audi Dealer Service History (2017 Registered)",
      "Audi Drive Select — Sport Driving Mode",
      "Xenon Headlights & Dynamic Sweeping LED Taillights",
      "Rear View Camera & Front/Rear Parking Sensors",
      "Cruise Control & Speed Limiter",
      "Bluetooth / USB / MMI Infotainment Display",
      "Power Heated Side Mirrors & Dual-Zone Digital Climate Control",
      "Timing Belt Set, Transmission Fluid & Reinforced Mechatronic Newly Serviced",
    ],
    description: {
      tr: "2016 model 2017 çıkışlı, bakımlarının tamamı Audi Eröz Yetkili Servisinde yapılmış Audi Q2 1.6 TDI Design. Triger kayışı, şanzıman yağı ve güçlendirilmiş mekatronik tüpü yeni değişmiş; şase, podye, direkler ve airbagler tamamen hatasızdır.",
      en: "2016 (2017 registered) Audi Q2 1.6 TDI Design with full official Audi dealer service history. Timing belt and S-Tronic transmission service recently completed.",
    },
  },
  {
    id: "ferrari-296-gts",
    brand: "Ferrari",
    title: "Ferrari 296 GTS 3.0 V6 Assetto Carbon",
    year: 2025,
    km: 1200,
    fuel: "Hibrit",
    gear: "Otomatik",
    body: "Cabrio",
    status: "active",
    imageFit: "cover",
    images: [
      "/cars/ferrari-296-gts/1.jpg",
      "/cars/ferrari-296-gts/2.jpg",
      "/cars/ferrari-296-gts/3.jpg",
      "/cars/ferrari-296-gts/4.jpg",
      "/cars/ferrari-296-gts/5.jpg",
      "/cars/ferrari-296-gts/6.jpg",
    ],
    specs: {
      power: "830 HP (V6 Plug-in Hybrid)",
      color: "Rosso Corsa / Nero Deri",
      package: "Carbon Racing Package",
      expertise: "Hatasız / Boyasız / Bayi Çıkışlı",
      tramer: "Yok",
    },
    extras: [
      "Karbon Fiber Yarış Koltukları (Daytona Stil)",
      "LED'li Karbon Fiber Sürücü Bölgesi ve Direksiyon",
      "Ön Aks Yükseltme Sistemi (Suspension Lifter)",
      "Scuderia Ferrari Çamurluk Logoları",
      "Karbon Seramik Fren Sistemi & Sarı Kaliperler",
      "Yolcu Ekranı (Passenger Display)",
      "JBL Profesyonel Ses Sistemi & Apple CarPlay",
      "360 Derece Çevre Görüş Kamerası",
    ],
    extrasEn: [
      "Carbon Fiber Daytona Racing Seats",
      "Carbon Fiber Driver Zone + LEDs Steering Wheel",
      "Front Suspension Lifter System",
      "Scuderia Ferrari Fender Shields",
      "Carbon Ceramic Brakes with Yellow Calipers",
      "Passenger Display Screen",
      "JBL Professional Sound System & Apple CarPlay",
      "360-Degree Surround View Camera",
    ],
    description: {
      tr: "Fermas yetkili bayi çıkışlı, tam karbon iç ve dış opsiyon paketine sahip 830 HP gücünde Ferrari 296 GTS Spider. Katlanabilir hard-top tavan ve kusursuz koleksiyon kondisyonu.",
      en: "Official dealer delivered 830 HP Ferrari 296 GTS Spider with full carbon interior and exterior package, Carbon Racing seats, and front suspension lifter.",
    },
  },
  {
    id: "porsche-911-gt3-weissach",
    brand: "Porsche",
    title: "Porsche 911 GT3 (992.2) Weissach Package",
    year: 2025,
    km: 0,
    fuel: "Benzin",
    gear: "Otomatik",
    body: "Coupe",
    status: "active",
    imageFit: "cover",
    images: [
      "/cars/porsche-911-gt3/1.jpg",
      "/cars/porsche-911-gt3/2.jpg",
      "/cars/porsche-911-gt3/3.jpg",
      "/cars/porsche-911-gt3/4.jpg",
      "/cars/porsche-911-gt3/5.jpg",
      "/cars/porsche-911-gt3/6.jpg",
    ],
    specs: {
      power: "510 HP (4.0 Atmosferik Boxer)",
      color: "Oak Green Metallic Neo",
      package: "Weissach Carbon Package",
      expertise: "Sıfır KM / Hatasız / Boyasız",
      tramer: "Yok",
    },
    extras: [
      "Weissach Paketi (Görünür Karbon Kaput, Tavan ve Arka Kanat)",
      "918 Spyder Tipi Tam Karbon Bucket Koltuklar",
      "Ön Aks Lift (Yükseltme) Sistemi",
      "Porsche Ceramic Composite Brake (PCCB)",
      "Sport Chrono Paketi & PDLS+ Matrix LED Farlar",
      "BOSE Surround Ses Sistemi",
      "Race-Tex & Deri Weissach Logolu İç Mekan",
      "Merkezi Kilitli Hafif Alaşım GT3 Jantlar",
    ],
    extrasEn: [
      "Weissach Package (Exposed Carbon Hood, Roof & Rear Wing)",
      "918 Spyder Full Carbon Bucket Seats",
      "Front Axle Lift System",
      "Porsche Ceramic Composite Brake (PCCB)",
      "Sport Chrono Package & PDLS+ Matrix LED Headlights",
      "BOSE Surround Sound System",
      "Race-Tex & Leather Interior with Weissach Embroidery",
      "Center-Lock Forged Lightweight GT3 Wheels",
    ],
    description: {
      tr: "Yeni 992.2 kasa makyajlı Porsche 911 GT3 Weissach Paket. Özel Oak Green Metallic Neo rengi, 9.000 d/d çeviren 4.0 litre atmosferik motoru ve sıfır kilometre kondisyonuyla teslime hazır.",
      en: "Facelifted 992.2 Porsche 911 GT3 with the coveted Weissach Package in Oak Green Metallic Neo. 9,000 RPM naturally aspirated 4.0L flat-six, zero kilometers.",
    },
  },
  {
    id: "lamborghini-urus-se",
    brand: "Lamborghini",
    title: "Lamborghini Urus SE 4.0 V8 800 HP",
    year: 2026,
    km: 0,
    fuel: "Hibrit",
    gear: "Otomatik",
    body: "SUV",
    status: "active",
    imageFit: "cover",
    images: [
      "/cars/lamborghini-urus-se/1.jpg",
      "/cars/lamborghini-urus-se/2.jpg",
      "/cars/lamborghini-urus-se/3.jpg",
      "/cars/lamborghini-urus-se/4.jpg",
      "/cars/lamborghini-urus-se/5.jpg",
      "/cars/lamborghini-urus-se/6.jpg",
    ],
    specs: {
      power: "800 HP (4.0 V8 Twin-Turbo PHEV)",
      color: "Grigio Titans (Mat Füme)",
      package: "Ad Personam & B&O 3D",
      expertise: "Sıfır KM / Hatasız / Boyasız",
      tramer: "Yok",
    },
    extras: [
      "Bang & Olufsen 3D Gelişmiş Ses Sistemi",
      "Arka Aks Yönlendirme & Adaptif Havalı Süspansiyon",
      "23\" Galanthus Parlak Siyah Jantlar & Karbon Seramik Frenler",
      "Panoramik Açılır Cam Tavan",
      "Masaj, Isıtma ve Soğutma Fonksiyonlu Q-Citura Deri Koltuklar",
      "Tam Karbon İç Mekan Paketi & Ambiyans Aydınlatma",
      "Gece Görüş Asistanı (Night Vision) & Head-Up Display",
      "Vakumlu Kapılar (Soft Close) & 360 Derece 3D Kamera",
    ],
    extrasEn: [
      "Bang & Olufsen 3D Advanced Sound System",
      "Rear-Axle Steering & Adaptive Air Suspension",
      "23\" Galanthus Gloss Black Wheels & Carbon Ceramic Brakes",
      "Panoramic Sliding Glass Sunroof",
      "Massage, Heated & Ventilated Q-Citura Leather Seats",
      "Full Carbon Interior Package & Ambient Lighting",
      "Night Vision Assistant & Head-Up Display",
      "Soft-Close Automatic Doors & 360° 3D Camera",
    ],
    description: {
      tr: "Yeni nesil 800 HP Lamborghini Urus SE. Ad Personam özel mat füme dış renk, Bang & Olufsen 3D ses sistemi ve arka aks yönlendirme ile süper SUV segmentinin zirvesi.",
      en: "Next-generation 800 HP Lamborghini Urus SE in Grigio Titans matte finish with Bang & Olufsen 3D audio, rear-axle steering, and full carbon interior.",
    },
  },
  {
    id: "rolls-royce-spectre",
    brand: "Rolls-Royce",
    title: "Rolls-Royce Spectre Coupe Bespoke Starlight",
    year: 2024,
    km: 7000,
    fuel: "Elektrik",
    gear: "Otomatik",
    body: "Coupe",
    status: "active",
    imageFit: "cover",
    images: [
      "/cars/rolls-royce-spectre/1.jpg",
      "/cars/rolls-royce-spectre/2.jpg",
      "/cars/rolls-royce-spectre/3.jpg",
      "/cars/rolls-royce-spectre/4.jpg",
      "/cars/rolls-royce-spectre/5.jpg",
      "/cars/rolls-royce-spectre/6.jpg",
    ],
    specs: {
      power: "585 HP (900 Nm AWD)",
      color: "Bespoke Çift Ton Bordo / Gümüş",
      package: "Starlight Doors & Coachline",
      expertise: "Hatasız / Boyasız / Bayi Çıkışlı",
      tramer: "Yok",
    },
    extras: [
      "Shooting Starlight Tavan ve Starlight Kapı Panelleri (4.796 Yıldız)",
      "Aydınlatmalı Pantheon Ön Izgara & Spirit of Ecstasy",
      "23\" Yedi Kollu Parlak Aero Jantlar",
      "El Çizimi Özel Coachline Şeridi",
      "Rolls-Royce Bespoke Studio Ses Sistemi",
      "Otomatik Kapanan E-Latch Konfor Kapıları",
      "Masaj ve Havalandırmalı Bespoke Deri Koltuklar",
      "Planar Süspansiyon & Dört Tekerlekten Yönlendirme",
    ],
    extrasEn: [
      "Shooting Starlight Headliner & Starlight Doors (4,796 Stars)",
      "Illuminated Pantheon Grille & Spirit of Ecstasy",
      "23\" Seven-Spoke Polished Aero Wheels",
      "Hand-Painted Bespoke Coachline",
      "Rolls-Royce Bespoke Studio Audio System",
      "Effortless E-Latch Power Doors",
      "Massage & Ventilated Bespoke Leather Seats",
      "Planar Suspension & Four-Wheel Steering",
    ],
    description: {
      tr: "Rolls-Royce'un ultra lüks elektrikli süper coupe modeli Spectre. Starlight kapı içi ve tavan döşemesi, 23 inç jantlar ve el işçiliği Coachline ile eşsiz bir sanat eseri.",
      en: "Rolls-Royce Spectre ultra-luxury electric super coupe featuring Starlight doors and headliner, hand-painted Coachline, 23-inch wheels, and Bespoke interior.",
    },
  },
  {
    id: "mercedes-g63-grand-edition",
    brand: "Mercedes-AMG",
    title: "Mercedes-AMG G 63 Grand Edition (1 of 1000)",
    year: 2024,
    km: 6001,
    fuel: "Benzin",
    gear: "Otomatik",
    body: "SUV",
    status: "active",
    imageFit: "cover",
    images: [
      "/cars/mercedes-g63/1.jpg",
      "/cars/mercedes-g63/2.jpg",
      "/cars/mercedes-g63/3.jpg",
      "/cars/mercedes-g63/4.jpg",
      "/cars/mercedes-g63/5.jpg",
      "/cars/mercedes-g63/6.jpg",
    ],
    specs: {
      power: "585 HP (4.0 V8 Biturbo)",
      color: "MANUFAKTUR Gece Siyahı Magno / Altın",
      package: "Grand Edition (Dünyada 1000 Adet)",
      expertise: "Hatasız / Boyasız / Bayi Çıkışlı",
      tramer: "Yok",
    },
    extras: [
      "Dünyada Sadece 1.000 Adet Üretilen 'Grand Edition' Özel Seri",
      "Kalahari Altın Magno Dış Detaylar ve 22\" AMG Dövme Jantlar",
      "Altın Dikişli MANUFAKTUR Siyah Nappa Deri Koltuklar",
      "Bakır İplikli Özel AMG Karbon Fiber İç Trimler",
      "Burmester Surround Ses Sistemi",
      "Aktif Çok Konturlu Masajlı & Soğutmalı Ön Koltuklar",
      "AMG Ride Control & Performans Egzoz Sistemi",
      "360 Derece Kamera & Distronic Plus Sürüş Asistanı",
    ],
    extrasEn: [
      "Limited 'Grand Edition' Series (1 of 1,000 Worldwide)",
      "Kalahari Gold Magno Accents & 22\" AMG Forged Wheels",
      "MANUFAKTUR Black Nappa Leather with Gold Stitching",
      "AMG Carbon Fiber Trim with Copper Thread",
      "Burmester Surround Sound System",
      "Active Multicontour Massage & Ventilated Front Seats",
      "AMG Ride Control & Performance Exhaust System",
      "360° Camera & Distronic Plus Driver Assistance",
    ],
    description: {
      tr: "Dünya genelinde yalnızca 1.000 adet üretilen koleksiyonluk Mercedes-AMG G 63 Grand Edition. MANUFAKTUR Gece Siyahı Magno gövde ve Kalahari Altın detaylarıyla ByCar siyah-altın ruhunu yansıtan özel seri.",
      en: "Limited to 1,000 units worldwide: Mercedes-AMG G 63 Grand Edition in MANUFAKTUR Night Black Magno with Kalahari Gold Magno accents and 22-inch forged wheels.",
    },
  },
  {
    id: "bmw-m4-competition-2025",
    brand: "BMW M",
    title: "BMW M4 Competition Coupe M xDrive",
    year: 2025,
    km: 27875,
    fuel: "Benzin",
    gear: "Otomatik",
    body: "Coupe",
    status: "active",
    imageFit: "cover",
    images: [
      "/cars/bmw-m4/1.jpg",
      "/cars/bmw-m4/2.jpg",
      "/cars/bmw-m4/3.jpg",
      "/cars/bmw-m4/4.jpg",
      "/cars/bmw-m4/5.jpg",
      "/cars/bmw-m4/6.jpg",
    ],
    specs: {
      power: "530 HP (3.0 M TwinPower Turbo)",
      color: "Brooklyn Gri / Kyalami Turuncu",
      package: "M Competition xDrive",
      expertise: "Hatasız / Boyasız / Borusan Çıkışlı",
      tramer: "Yok",
    },
    extras: [
      "M Karbon Tavan & M Karbon İç Trim Paketi",
      "M xDrive Akıllı Dört Çeker (4WD / 4WD Sport / 2WD Drift Modu)",
      "Harman Kardon Surround Ses Sistemi",
      "BMW kavisli ekran (Curved Display) & M Head-Up Display",
      "Adaptif M Süspansiyon & M Bileşik Fren Sistemi",
      "Isıtmalı ve Elektrikli Hafızalı M Spor Koltuklar",
      "Sürüş Asistanı Profesyonel & Park Asistanı Plus (360 Kamera)",
    ],
    extrasEn: [
      "M Carbon Roof & M Carbon Interior Trim Package",
      "M xDrive Intelligent AWD (4WD / 4WD Sport / 2WD Drift Mode)",
      "Harman Kardon Surround Sound System",
      "BMW Curved Display & M Head-Up Display",
      "Adaptive M Suspension & M Compound Brakes",
      "Heated & Power Memory M Sport Seats",
      "Driving Assistant Professional & Parking Assistant Plus (360° Camera)",
    ],
    description: {
      tr: "Borusan Otomotiv yetkili bayi çıkışlı 2025 BMW M4 Competition Coupe M xDrive. 530 HP güç üreten makyajlı LCI versiyon, karbon tavan ve tam dolu donanım.",
      en: "Official dealer delivered 2025 BMW M4 Competition Coupe M xDrive (LCI 530 HP) with carbon roof, M carbon interior trim, and Harman Kardon sound.",
    },
  },
  {
    id: "audi-rs6-performance",
    brand: "Audi RS",
    title: "Audi RS6 Avant Performance 4.0 TFSI Quattro",
    year: 2024,
    km: 0,
    fuel: "Benzin",
    gear: "Otomatik",
    body: "Sedan",
    status: "active",
    imageFit: "cover",
    images: [
      "/cars/audi-rs6/1.jpg",
      "/cars/audi-rs6/2.jpg",
      "/cars/audi-rs6/3.jpg",
      "/cars/audi-rs6/4.jpg",
      "/cars/audi-rs6/5.jpg",
      "/cars/audi-rs6/6.jpg",
    ],
    specs: {
      power: "630 HP (850 Nm V8 Biturbo)",
      color: "Nardo Gri / Valcona Deri",
      package: "RS Performance Dynamic Plus",
      expertise: "Sıfır KM / Hatasız / Boyasız",
      tramer: "Yok",
    },
    extras: [
      "RS Spor Egzoz Sistemi & Dinamik Sürüş Paketi",
      "Dört Tekerlekten Yönlendirme (Arka Aks) & RS Havalı Süspansiyon",
      "22\" Hafifletilmiş RS Performance Jantlar",
      "HD Matrix LED Lazer Farlar & Dinamik Sinyaller",
      "Bang & Olufsen 3D Premium Ses Sistemi",
      "Bal Peteği Dikişli Havalandırmalı Valcona Deri RS Koltuklar",
      "Panoramik Cam Tavan, Vakumlu Kapılar & Head-Up Display",
    ],
    extrasEn: [
      "RS Sports Exhaust System & Dynamic Driving Package",
      "All-Wheel Steering (Rear Axle) & RS Adaptive Air Suspension",
      "22\" Lightweight RS Performance Wheels",
      "HD Matrix LED Laser Headlights & Dynamic Turn Signals",
      "Bang & Olufsen 3D Premium Sound System",
      "Honeycomb-Stitched Ventilated Valcona Leather RS Seats",
      "Panoramic Sunroof, Soft-Close Doors & Head-Up Display",
    ],
    description: {
      tr: "630 HP gücündeki 2024 Audi RS6 Avant Performance. İkonik Nardo Gri rengi, arka aks yönlendirme, Bang & Olufsen ses sistemi ve sıfır kilometre kondisyonuyla.",
      en: "630 HP 2024 Audi RS6 Avant Performance in iconic Nardo Grey with rear-axle steering, RS sports exhaust, and Bang & Olufsen 3D sound system.",
    },
  },
  {
    id: "bentley-gt-speed-first-edition",
    brand: "Bentley",
    title: "Bentley Continental GT Speed First Edition",
    year: 2024,
    km: 6001,
    fuel: "Hibrit",
    gear: "Otomatik",
    body: "Coupe",
    sold: true,
    status: "sold",
    imageFit: "cover",
    images: [
      "/cars/bentley-gt/1.jpg",
      "/cars/bentley-gt/2.jpg",
      "/cars/bentley-gt/3.jpg",
      "/cars/bentley-gt/4.jpg",
      "/cars/bentley-gt/5.jpg",
      "/cars/bentley-gt/6.jpg",
    ],
    specs: {
      power: "782 HP (1000 Nm Ultra Performance Hybrid)",
      color: "Gravity Grey / Mulliner Deri",
      package: "First Edition & Naim Audio",
      expertise: "Hatasız / Boyasız / Koleksiyondan Teslim Edildi",
      tramer: "Yok",
    },
    extras: [
      "Naim For Bentley 2.200W Referans Ses Sistemi",
      "Bentley Döner Ekran (Rotating Display)",
      "Karbon Seramik Fren Sistemi & 22\" Speed Jantlar",
      "Mulliner Elmas Kapitone Deri & Wellness Koltuk Paketi",
      "Elektronik Dört Tekerlekten Yönlendirme & Aktif Roll Kontrol",
      "First Edition Özel Dış ve İç Rozetler",
    ],
    extrasEn: [
      "Naim For Bentley 2,200W Reference Audio System",
      "Bentley Rotating Display",
      "Carbon Ceramic Brakes & 22\" Speed Wheels",
      "Mulliner Diamond Quilted Leather & Wellness Seating",
      "Electronic All-Wheel Steering & Active Roll Control",
      "First Edition Bespoke Exterior & Interior Badges",
    ],
    description: {
      tr: "782 HP Ultra Performance Hybrid motorlu yeni Bentley Continental GT Speed First Edition. Naim ses sistemi ve döner ekran donanımlı aracımız VIP müşterimize teslim edilmiştir.",
      en: "782 HP Ultra Performance Hybrid Bentley Continental GT Speed First Edition with Naim audio and Rotating Display. Delivered from our VIP collection.",
    },
  },
];

export const INITIAL_INQUIRIES: Inquiry[] = [
  {
    id: "inq-1",
    type: "Teklif",
    name: "Mehmet Karahan",
    car: "Cupra Formentor 1.5 TSI ACT 150 HP DSG",
    phone: "+90 532 418 22 10",
    offerOrBudget: "Takas + Nakit Teklifi (2021 BMW 320i ile takas değerlendirilir mi?)",
    time: "15 dk önce",
    status: "Yeni",
  },
  {
    id: "inq-2",
    type: "İthalat",
    name: "Selin Arslan",
    car: "Porsche 911 Turbo S Cabriolet (2024)",
    phone: "+90 542 880 14 90",
    offerOrBudget: "380.000 EUR — Almanya Menşei",
    details: "Dış renk Chalk Gri, Bordo tente tercih ediyorum.",
    time: "2 saat önce",
    status: "İletişime Geçildi",
  },
  {
    id: "inq-3",
    type: "Teklif",
    name: "Ahmet Yılmazer",
    car: "Mercedes-AMG G 63 Grand Edition (1 of 1000)",
    phone: "+90 533 612 09 45",
    offerOrBudget: "VIP Ekspertiz & Özel Fiyat Talebi",
    time: "Dün",
    status: "Yeni",
  },
];

const CARS_KEY = "bycar_fleet_v5";
const INQ_KEY = "bycar_inquiries_v2";
const SETTINGS_KEY = "bycar_settings_v1";
const LANG_KEY = "bycar_lang_v1";
const LOCKOUT_KEY = "bycar_admin_lockout_v1";
const SYNC_EVENT = "bycar-store-sync";

// Web Crypto API PBKDF2-HMAC-SHA256 verification + Brute-Force Rate Limiting (15 min / 5 attempts)
const ADMIN_PBKDF2_SALT = "bycar-global-vip-salt-2026";
const ADMIN_PBKDF2_ITERATIONS = 100000;
let cachedExpectedHash: string | null = null;

async function derivePBKDF2Hex(password: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return password === "bycar2024" ? "VALID_FALLBACK" : "INVALID";
  }
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(ADMIN_PBKDF2_SALT),
      iterations: ADMIN_PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyAdminPasswordPBKDF2(input: string): Promise<boolean> {
  if (!cachedExpectedHash) {
    cachedExpectedHash = await derivePBKDF2Hex("bycar2024");
  }
  const candidate = await derivePBKDF2Hex(input);
  return candidate === cachedExpectedHash;
}

export type LockoutState = {
  attempts: number;
  lockedUntil: number | null;
};

export function getLoginLockoutState(): LockoutState {
  if (typeof window === "undefined") return { attempts: 0, lockedUntil: null };
  try {
    const raw = window.localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { attempts: 0, lockedUntil: null };
    const parsed = JSON.parse(raw) as LockoutState;
    if (parsed.lockedUntil && Date.now() > parsed.lockedUntil) {
      window.localStorage.removeItem(LOCKOUT_KEY);
      return { attempts: 0, lockedUntil: null };
    }
    return parsed;
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

export function recordLoginAttempt(success: boolean): LockoutState {
  if (typeof window === "undefined") return { attempts: 0, lockedUntil: null };
  if (success) {
    window.localStorage.removeItem(LOCKOUT_KEY);
    return { attempts: 0, lockedUntil: null };
  }
  const current = getLoginLockoutState();
  const nextAttempts = current.attempts + 1;
  const lockedUntil = nextAttempts >= 5 ? Date.now() + 15 * 60 * 1000 : null;
  const nextState: LockoutState = { attempts: nextAttempts, lockedUntil };
  window.localStorage.setItem(LOCKOUT_KEY, JSON.stringify(nextState));
  return nextState;
}

// Client-Side HTML5 Canvas WebP Compression (prevents storage overflow & speeds up loading)
export async function compressImageToWebP(
  file: File,
  maxWidth = 1600,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Dosya okunamadı"));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (typeof document === "undefined") {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const webpUrl = canvas.toDataURL("image/webp", quality);
          resolve(webpUrl.startsWith("data:image/webp") ? webpUrl : dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function getStoredCars(): Car[] {
  if (typeof window === "undefined") return CARS;
  try {
    const raw = window.localStorage.getItem(CARS_KEY);
    if (!raw) return CARS;
    const parsed = JSON.parse(raw) as Car[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : CARS;
  } catch {
    return CARS;
  }
}

export function saveStoredCars(next: Car[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CARS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export function resetStoredCars() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CARS_KEY);
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export function getStoredInquiries(): Inquiry[] {
  if (typeof window === "undefined") return INITIAL_INQUIRIES;
  try {
    const raw = window.localStorage.getItem(INQ_KEY);
    if (!raw) return INITIAL_INQUIRIES;
    const parsed = JSON.parse(raw) as Inquiry[];
    return Array.isArray(parsed) ? parsed : INITIAL_INQUIRIES;
  } catch {
    return INITIAL_INQUIRIES;
  }
}

export function saveStoredInquiries(next: Inquiry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INQ_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export function addStoredInquiry(item: Omit<Inquiry, "id" | "time" | "status">) {
  const current = getStoredInquiries();
  const created: Inquiry = {
    ...item,
    id: `inq-${Date.now()}`,
    time: "Az önce",
    status: "Yeni",
  };
  saveStoredInquiries([created, ...current]);
  return created;
}

export function getStoredSettings(): SiteSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<SiteSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(next: SiteSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "tr";
  const raw = window.localStorage.getItem(LANG_KEY);
  return raw === "en" ? "en" : "tr";
}

export function saveStoredLang(next: Lang) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANG_KEY, next);
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export function useByCarStore() {
  const [cars, setCars] = useState<Car[]>(CARS);
  const [inquiries, setInquiries] = useState<Inquiry[]>(INITIAL_INQUIRIES);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [lang, setLangState] = useState<Lang>("tr");

  useEffect(() => {
    const sync = () => {
      setCars(getStoredCars());
      setInquiries(getStoredInquiries());
      setSettings(getStoredSettings());
      setLangState(getStoredLang());
    };
    sync();
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    cars,
    inquiries,
    settings,
    lang,
    setLang: saveStoredLang,
    updateCars: saveStoredCars,
    resetCars: resetStoredCars,
    updateInquiries: saveStoredInquiries,
    addInquiry: addStoredInquiry,
    updateSettings: saveStoredSettings,
  };
}

export const T = {
  tr: {
    nav: ["Koleksiyon", "Özel İthalat", "İthalat Süreci", "Kurucumuz", "SSS", "İletişim"],
    heroTitle: "Lüksün Yeni Adresi.",
    heroSub: "Dünyanın en seçkin otomobilleri, kişiye özel tedarik ve uluslararası güvenceyle sizin için.",
    explore: "Koleksiyonu Keşfet",
    importReq: "Özel İthalat Talebi",
    collection: "Seçkin Koleksiyon",
    search: "Ara: Formentor, Q2, 296 GTS, GT3, Urus, G63…",
    all: "Tümü",
    statusLabel: "Durum",
    statusAll: "Tüm Araçlar",
    statusAvailable: "Satışta Olanlar",
    statusSold: "Satılanlar",
    quote: "Fiyat Teklifi Al",
    soldBtn: "Koleksiyondan Satıldı",
    sold: "SATILDI",
    waQuote: "WhatsApp ile Teklif Al",
    call: "VIP Danışmanı Ara",
    form: "Site Üzerinden Teklif Ver",
    send: "Talebi VIP Danışmana İlet",
    sent: "Talebiniz VIP yönetim sistemimize kaydedildi ve WhatsApp danışman hattımız hazırlandı.",
    process: "Uluslararası İthalat Süreci",
    steps: [
      ["Talep & Küresel Pazar Analizi", "Aradığınız spesifikasyonu Avrupa ve küresel yetkili bayi ağımızda analiz ediyoruz."],
      ["Tedarik & Bağımsız Ekspertiz", "Uluslararası bağımsız ekspertiz raporu ve geçmiş doğrulaması ile sıfır riskli tedarik."],
      ["Gümrük & Kapalı Lojistik", "Sigortalı kapalı tır/konteyner taşıma ve tüm gümrükleme süreçlerinin anahtar teslim yönetimi."],
      ["Anahtar Teslim VIP Teslimat", "Tescil ve plaka işlemleri tamamlanmış aracınız dilediğiniz adreste size teslim edilir."],
    ],
    founder: "Kurucumuzun Vizyonu",
    founderParagraphs: [
      "ByCar, otomobil tutkusunu uluslararası bir vizyonla buluşturmak amacıyla kurulmuştur. 2020 yılından bu yana otomotiv sektöründe edindiği deneyimle kurucumuz Burak Yılmaz, ByCar’ı premium ve ultra lüks otomobil sektöründe güçlü bir marka haline getirmeyi hedeflemektedir.",
      "Mercedes-Benz, BMW, Porsche, Ferrari, Lamborghini, Bentley, Rolls-Royce, Audi ve Cupra gibi dünyanın önde gelen otomobil markalarını seçkin müşterilerle buluşturmayı amaçlayan ByCar, yalnızca araç satışına değil, kişiye özel bir otomobil deneyimi sunmaya odaklanmaktadır.",
      "Kurucumuzun vizyonu; coğrafi sınırların ötesine geçen, güven, şeffaflık ve profesyonellik üzerine inşa edilmiş uluslararası bir otomobil markası oluşturmaktır. ByCar için lüks, yalnızca bir otomobile sahip olmak değil; ayrıcalıklı bir deneyimin parçası olmaktır.",
    ],
    founderSlogan: "BYCAR — Luxury Without Borders.",
    importTitle: "Özel Araç İthalatı & Tedarik",
    importSub: "Koleksiyonumuzda yer almayan hayalinizdeki otomobili, istediğiniz renk ve donanım kombinasyonuyla dünyanın her yerinden sizin için getiriyoruz.",
    f: {
      model: "İstediğiniz Marka & Model (Örn: Porsche 911 Turbo S)",
      year: "Tercih Edilen Model Yılı",
      budget: "Planlanan Bütçe",
      country: "Tercih Edilen Menşei (Almanya, İtalya, Dubai vb.)",
      name: "Adınız Soyadınız",
      phone: "Telefon Numaranız (+90...)",
      offer: "Teklif Tutarı / Takas Aracınız / Özel Notunuz",
    },
    faq: "Sıkça Sorulan Sorular",
    faqSub: "Lüks araç tedariki, ekspertiz güvencesi ve uluslararası ithalat süreçlerimiz hakkında merak edilenler.",
    faqs: [
      [
        "Araç fiyatları neden sitede yer almıyor?",
        "ByCar, seçkin portföyündeki araçlar için güncel döviz kurları, özel gümrük/vergi avantajları ve kişiye özel takas/finansman yapılandırması sunar. En doğru ve güncel fiyatlandırma için 'Fiyat Teklifi Al' veya 'Site Üzerinden Teklif Ver' butonlarıyla VIP danışmanımızdan anında bilgi alabilirsiniz.",
      ],
      [
        "Özel ithalat (sipariş üzerine araç getirme) süreci ne kadar sürer?",
        "Avrupa (Almanya, İtalya, Belçika vb.) menşeli hazır stok araçlarda ekspertiz, kapalı lojistik ve gümrük işlemleri dahil ortalama 2 ila 4 hafta içinde anahtar teslim gerçekleştirilir.",
      ],
      [
        "Araçların ekspertiz ve kilometre garantisi var mı?",
        "Koleksiyonumuzdaki ve ithal ettiğimiz tüm araçlar yetkili servis geçmişli olup, uluslararası bağımsız ekspertiz kuruluşları (TÜV / DEKRA) ve Türkiye'deki kurumsal ekspertiz merkezleri tarafından şase, boya, mekanik ve orijinal kilometre garantisiyle teslim edilir.",
      ],
      [
        "Mevcut aracımı takasta değerlendirebilir miyim?",
        "Evet. Portföyümüzdeki tüm araçlar için mevcut lüks veya premium segment aracınızı gerçek piyasa değerinde takas olarak değerlendiriyoruz. Teklif formunda takas aracınızı belirtebilirsiniz.",
      ],
      [
        "Gümrük, ÖTV ve plaka tescil işlemlerini kim yürütüyor?",
        "Tüm gümrükleme, ÖTV/KDV tahakkukları, TSE uygunluk belgesi ve noter/plaka tescil süreçleri ByCar Global'in uzman hukuk ve müşavirlik ekibi tarafından anahtar teslim olarak yürütülür.",
      ],
    ],
    privacy: "KVKK ve Gizlilik Politikası",
    kvkkTitle: "KVKK Aydınlatma Metni ve Gizlilik Politikası",
    kvkkBody: [
      "1. Veri Sorumlusu: ByCar Global ('ByCar — Exclusive Automotive') olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ('KVKK') kapsamında kişisel verilerinizin güvenliğine en üst düzeyde önem veriyoruz.",
      "2. İşlenen Kişisel Veriler ve Amaç: Web sitemiz üzerindeki 'Fiyat Teklifi Al', 'Site Üzerinden Teklif Ver' ve 'Özel İthalat Talebi' formları aracılığıyla paylaştığınız Ad-Soyad, Telefon Numarası ve Araç Tercihi bilgileriniz; yalnızca size özel fiyat teklifi sunulması, araç tedarik sürecinin yürütülmesi ve VIP müşteri danışmanlarımızın sizinle iletişime geçmesi amacıyla işlenmektedir.",
      "3. Verilerin Aktarımı ve Güvenliği: Paylaştığınız iletişim ve teklif verileri hiçbir koşulda üçüncü taraf reklam veya pazarlama şirketleriyle paylaşılmaz; yalnızca gizlilik protokolü altında ByCar yetkilileri tarafından görüntülenir.",
      "4. Haklarınız: KVKK'nın 11. maddesi uyarınca verilerinizin silinmesini, düzeltilmesini veya bilgi talep etme hakkınızı her zaman +90 540 061 16 34 numaralı hattımız üzerinden kullanabilirsiniz.",
    ],
  },
  en: {
    nav: ["Collection", "Private Import", "Import Process", "Founder", "FAQ", "Contact"],
    heroTitle: "The New Address of Luxury.",
    heroSub: "The world's most exceptional automobiles, bespoke sourcing and international assurance tailored for you.",
    explore: "Explore the Collection",
    importReq: "Private Import Request",
    collection: "Curated Collection",
    search: "Search: Formentor, Q2, 296 GTS, GT3, Urus, G63…",
    all: "All",
    statusLabel: "Status",
    statusAll: "All Vehicles",
    statusAvailable: "Available",
    statusSold: "Sold Archive",
    quote: "Request a Quote",
    soldBtn: "Sold from Collection",
    sold: "SOLD",
    waQuote: "Get a Quote on WhatsApp",
    call: "Call VIP Advisor",
    form: "Make an Offer Online",
    send: "Submit to VIP Advisor",
    sent: "Your request has been saved to our VIP system and prepared for immediate WhatsApp consultation.",
    process: "International Import Process",
    steps: [
      ["Request & Global Market Analysis", "We analyze the global authorized dealer network for your exact specification."],
      ["Sourcing & Independent Inspection", "Zero-risk procurement backed by TÜV/DEKRA inspection and full service history verification."],
      ["Customs & Enclosed Logistics", "Fully insured enclosed transport and turnkey customs clearance management."],
      ["Turnkey VIP Delivery", "Delivered directly to your door with all registration and license plate formalities completed."],
    ],
    founder: "Our Founder's Vision",
    founderParagraphs: [
      "ByCar was established to unite automotive passion with an international vision. With deep experience in the automotive sector since 2020, our founder Burak Yılmaz aims to position ByCar as a powerhouse in the premium and ultra-luxury automotive world.",
      "Connecting distinguished clients with the world's leading marques — including Mercedes-Benz, BMW, Porsche, Ferrari, Lamborghini, Bentley, Rolls-Royce, Audi, and Cupra — ByCar focuses not merely on vehicle sales, but on delivering a bespoke automotive ownership experience.",
      "Our founder's vision is to build an international automotive brand transcending geographical borders, built upon trust, transparency, and professionalism. For ByCar, luxury is not merely owning an automobile; it is being part of an exclusive experience.",
    ],
    founderSlogan: "BYCAR — Luxury Without Borders.",
    importTitle: "Bespoke Vehicle Import & Sourcing",
    importSub: "Not in our current collection? We source your dream automobile in your exact color and specification from anywhere in the world.",
    f: {
      model: "Desired Make & Model (e.g. Porsche 911 Turbo S)",
      year: "Preferred Model Year",
      budget: "Target Budget",
      country: "Preferred Origin (Germany, Italy, Dubai, etc.)",
      name: "Full Name",
      phone: "Phone Number (+90...)",
      offer: "Your Offer / Trade-in Vehicle / Special Notes",
    },
    faq: "Frequently Asked Questions",
    faqSub: "Everything you need to know about our luxury vehicle sourcing, inspection guarantee, and turnkey import process.",
    faqs: [
      [
        "Why are prices provided upon request?",
        "ByCar provides tailored pricing reflecting real-time currency rates, bespoke import/tax structuring, and trade-in valuations. Click 'Request a Quote' or 'Make an Offer Online' for an immediate consultation with our VIP advisor.",
      ],
      [
        "How long does a private vehicle import take?",
        "For in-stock European vehicles (Germany, Italy, etc.), turnkey delivery including independent inspection, enclosed transport, and customs clearance takes 2 to 4 weeks.",
      ],
      [
        "Do vehicles come with an inspection and mileage guarantee?",
        "Every vehicle in our collection undergoes rigorous multi-point inspection (TÜV / DEKRA and official dealer verification) with a 100% guarantee on chassis integrity, paint condition, and original mileage.",
      ],
      [
        "Do you accept trade-in vehicles?",
        "Yes. We evaluate your current premium or luxury vehicle at competitive market value toward any automobile in our collection.",
      ],
      [
        "Who handles customs clearance and registration?",
        "Our dedicated legal and customs brokerage team manages all customs duties, homologation, and license plate registration on a complete turnkey basis.",
      ],
    ],
    privacy: "Privacy Policy & GDPR",
    kvkkTitle: "Data Protection (KVKK / GDPR) & Privacy Policy",
    kvkkBody: [
      "1. Data Controller: ByCar Global ('ByCar — Exclusive Automotive') is committed to protecting the confidentiality and security of your personal data under KVKK and GDPR standards.",
      "2. Purpose of Processing: Your Full Name, Phone Number, and Vehicle Preferences submitted through our 'Request a Quote', 'Make an Offer', and 'Private Import' forms are processed exclusively to provide personalized vehicle quotes and VIP advisory services.",
      "3. Confidentiality: Client inquiries and offer details are strictly confidential and are never shared with third-party marketing agencies.",
      "4. Your Rights: You may request access, correction, or deletion of your personal data at any time by contacting us at +90 540 061 16 34.",
    ],
  },
};
export type Lang = keyof typeof T;
