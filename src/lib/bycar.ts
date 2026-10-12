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

export const BRANDS = [
  "Cupra",
  "Ferrari",
  "Porsche",
  "Lamborghini",
  "Rolls-Royce",
  "Mercedes-AMG",
  "BMW M",
  "Audi",
  "Bentley",
];

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
    description: {
      tr: "Borusan Otomotiv yetkili bayi çıkışlı 2025 BMW M4 Competition Coupe M xDrive. 530 HP güç üreten makyajlı LCI versiyon, karbon tavan ve tam dolu donanım.",
      en: "Official dealer delivered 2025 BMW M4 Competition Coupe M xDrive (LCI 530 HP) with carbon roof, M carbon interior trim, and Harman Kardon sound.",
    },
  },
  {
    id: "audi-rs6-performance",
    brand: "Audi",
    title: "Audi RS6 Avant Performance 4.0 TFSI Quattro",
    year: 2024,
    km: 0,
    fuel: "Benzin",
    gear: "Otomatik",
    body: "Sedan",
    status: "active",
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

const CARS_KEY = "bycar_fleet_v4";
const INQ_KEY = "bycar_inquiries_v2";
const SYNC_EVENT = "bycar-store-sync";

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

export function useByCarStore() {
  const [cars, setCars] = useState<Car[]>(CARS);
  const [inquiries, setInquiries] = useState<Inquiry[]>(INITIAL_INQUIRIES);

  useEffect(() => {
    const sync = () => {
      setCars(getStoredCars());
      setInquiries(getStoredInquiries());
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
    updateCars: saveStoredCars,
    resetCars: resetStoredCars,
    updateInquiries: saveStoredInquiries,
    addInquiry: addStoredInquiry,
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
    search: "Ara: Formentor, 296 GTS, GT3, Urus, G63…",
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
    sent: "Talebiniz başarıyla VIP müşteri temsilcimize iletildi. En kısa sürede sizinle iletişime geçeceğiz.",
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
    search: "Search: Formentor, 296 GTS, GT3, Urus, G63…",
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
    sent: "Your request has been received. Our VIP automotive advisor will contact you shortly.",
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
