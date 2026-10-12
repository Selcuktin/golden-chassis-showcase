import { useSyncExternalStore } from "react";
import { CARS, PHONE, INSTAGRAM, type Car } from "@/lib/bycar";

export type Lead = {
  id: string;
  type: "Teklif" | "İthalat";
  name: string;
  phone: string;
  subject: string;
  date: string;
  status: "Yeni Talep" | "Görüşüldü" | "Tamamlandı";
};
export type Settings = { phone: string; instagram: string; address: string; hours: string };

const DEFAULT_SETTINGS: Settings = {
  phone: PHONE,
  instagram: INSTAGRAM,
  address: "İstanbul, Türkiye",
  hours: "Pzt – Cmt 10:00 – 19:00",
};

const listeners = new Set<() => void>();
const cache: Record<string, unknown> = {};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  if (key in cache) return cache[key] as T;
  try {
    const raw = localStorage.getItem("bycar_" + key);
    cache[key] = raw ? JSON.parse(raw) : fallback;
  } catch {
    cache[key] = fallback;
  }
  return cache[key] as T;
}
function write<T>(key: string, value: T) {
  cache[key] = value;
  try {
    localStorage.setItem("bycar_" + key, JSON.stringify(value));
  } catch {
    alert("Tarayıcı depolama alanı doldu. Daha az / daha küçük fotoğraf deneyin.");
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function useKey<T>(key: string, fallback: T): [T, (v: T) => void] {
  const v = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  return [v, (n: T) => write(key, n)];
}

export const useCars = () => useKey<Car[]>("cars", CARS);
export const useLeads = () => useKey<Lead[]>("leads", []);
export const useSettings = () => useKey<Settings>("settings", DEFAULT_SETTINGS);

export function addLead(l: Omit<Lead, "id" | "date" | "status">) {
  const leads = read<Lead[]>("leads", []);
  write("leads", [{ ...l, id: crypto.randomUUID(), date: new Date().toISOString(), status: "Yeni Talep" }, ...leads]);
}

export const phoneRaw = (p: string) => p.replace(/\D/g, "");

/** Shrink an uploaded photo so it fits in browser storage. */
export function fileToDataUrl(file: File, max = 1280): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * s;
      c.height = img.height * s;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.75));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}
