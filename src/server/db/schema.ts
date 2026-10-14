import { sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) =>
  text(name)
    .notNull()
    .default(sql`(datetime('now'))`);

export const vehicles = sqliteTable(
  "vehicles",
  {
    id: text("id"),
    slug: text("slug").notNull().unique(),
    brand: text("brand").notNull(),
    title: text("title").notNull(),
    year: integer("year").notNull(),
    km: integer("km").notNull().default(0),
    fuel: text("fuel").notNull(),
    gear: text("gear").notNull(),
    body: text("body").notNull(),
    power: text("power").notNull(),
    color: text("color").notNull(),
    package: text("package").notNull(),
    expertise: text("expertise").notNull(),
    tramer: text("tramer").notNull().default("Yok"),
    image_fit: text("image_fit").notNull().default("cover"),
    video_url: text("video_url"),
    extras_json: text("extras_json").notNull().default("[]"),
    extras_en_json: text("extras_en_json").notNull().default("[]"),
    description_tr: text("description_tr").notNull().default(""),
    description_en: text("description_en").notNull().default(""),
    status: text("status").notNull().default("active"),
    is_featured: integer("is_featured").notNull().default(0),
    created_at: timestamp("created_at"),
    updated_at: timestamp("updated_at"),
  },
  (t) => [
    primaryKey({ columns: [t.id] }),
    index("idx_vehicles_vitrin").on(
      t.status,
      sql`${t.is_featured} DESC`,
      sql`${t.created_at} DESC`,
    ),
    index("idx_vehicles_status_brand").on(t.status, t.brand),
    index("idx_vehicles_year").on(sql`${t.year} DESC`),
    check("vehicles_year_check", sql`${t.year} >= 1900`),
    check("vehicles_km_check", sql`${t.km} >= 0`),
    check("vehicles_fuel_check", sql`length(trim(${t.fuel})) > 0`),
    check("vehicles_gear_check", sql`length(trim(${t.gear})) > 0`),
    check("vehicles_body_check", sql`length(trim(${t.body})) > 0`),
    check("vehicles_image_fit_check", sql`${t.image_fit} IN ('contain', 'cover')`),
    check("vehicles_status_check", sql`${t.status} IN ('active', 'sold', 'draft')`),
  ],
);

export const vehicleImages = sqliteTable(
  "vehicle_images",
  {
    id: text("id"),
    vehicle_id: text("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    r2_key: text("r2_key").notNull().unique(),
    public_url: text("public_url").notNull(),
    is_cover: integer("is_cover").notNull().default(0),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at"),
  },
  (t) => [
    primaryKey({ columns: [t.id] }),
    index("idx_vehicle_images_vehicle").on(
      t.vehicle_id,
      sql`${t.is_cover} DESC`,
      sql`${t.sort_order} ASC`,
    ),
  ],
);

export const inquiries = sqliteTable(
  "inquiries",
  {
    id: text("id"),
    type: text("type").notNull(),
    vehicle_id: text("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    car_title: text("car_title").notNull(),
    customer_name: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    offer_or_budget: text("offer_or_budget").notNull(),
    details: text("details"),
    status: text("status").notNull().default("Yeni"),
    created_at: timestamp("created_at"),
  },
  (t) => [
    primaryKey({ columns: [t.id] }),
    index("idx_inquiries_status_created").on(t.status, sql`${t.created_at} DESC`),
    check("inquiries_type_check", sql`${t.type} IN ('Teklif', 'İthalat')`),
    check(
      "inquiries_status_check",
      sql`${t.status} IN ('Yeni', 'İletişime Geçildi', 'Tamamlandı')`,
    ),
  ],
);

export const adminUsers = sqliteTable(
  "admin_users",
  {
    id: text("id"),
    username: text("username").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    password_salt: text("password_salt").notNull(),
    iterations: integer("iterations").notNull().default(100000),
    created_at: timestamp("created_at"),
  },
  (t) => [
    primaryKey({ columns: [t.id] }),
    check("admin_users_iterations_check", sql`${t.iterations} >= 100000`),
  ],
);

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    id: text("id"),
    admin_id: text("admin_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull().unique(),
    ip_address: text("ip_address"),
    user_agent: text("user_agent"),
    expires_at: text("expires_at").notNull(),
    created_at: timestamp("created_at"),
  },
  (t) => [primaryKey({ columns: [t.id] }), index("idx_admin_sessions_token").on(t.token_hash)],
);

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: text("id"),
    ip_or_user_key: text("ip_or_user_key").notNull().unique(),
    attempt_count: integer("attempt_count").notNull().default(1),
    locked_until: text("locked_until"),
    updated_at: timestamp("updated_at"),
  },
  (t) => [primaryKey({ columns: [t.id] })],
);

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey().notNull(),
  value: text("value").notNull(),
  updated_at: timestamp("updated_at"),
});

export const inquiryAttempts = sqliteTable(
  "inquiry_attempts",
  {
    id: text("id"),
    ip: text("ip").notNull(),
    created_at: integer("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id] }),
    index("idx_inquiry_attempts_ip_time").on(t.ip, t.created_at),
  ],
);

export const r2CleanupQueue = sqliteTable(
  "r2_cleanup_queue",
  {
    id: text("id"),
    r2_key: text("r2_key").notNull(),
    attempts: integer("attempts").notNull().default(0),
    last_error: text("last_error"),
    created_at: integer("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.id] }), index("idx_r2_cleanup_queue_key").on(t.r2_key)],
);
