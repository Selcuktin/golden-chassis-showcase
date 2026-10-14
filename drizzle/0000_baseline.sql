-- Adoption baseline: IF NOT EXISTS preserves tables from the pre-migration app.
-- Follow-up migrations must use explicit ALTER/rebuild steps for existing tables.
CREATE TABLE IF NOT EXISTS `admin_sessions` (
	`id` text PRIMARY KEY,
	`admin_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `admin_sessions_token_hash_unique` ON `admin_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_admin_sessions_token` ON `admin_sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `admin_users` (
	`id` text PRIMARY KEY,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`iterations` integer DEFAULT 100000 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT "admin_users_iterations_check" CHECK("admin_users"."iterations" >= 100000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `admin_users_username_unique` ON `admin_users` (`username`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `inquiries` (
	`id` text PRIMARY KEY,
	`type` text NOT NULL,
	`vehicle_id` text,
	`car_title` text NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`offer_or_budget` text NOT NULL,
	`details` text,
	`status` text DEFAULT 'Yeni' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "inquiries_type_check" CHECK("inquiries"."type" IN ('Teklif', 'İthalat')),
	CONSTRAINT "inquiries_status_check" CHECK("inquiries"."status" IN ('Yeni', 'İletişime Geçildi', 'Tamamlandı'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_inquiries_status_created` ON `inquiries` (`status`,"created_at" DESC);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `inquiry_attempts` (
	`id` text PRIMARY KEY,
	`ip` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_inquiry_attempts_ip_time` ON `inquiry_attempts` (`ip`,`created_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `login_attempts` (
	`id` text PRIMARY KEY,
	`ip_or_user_key` text NOT NULL,
	`attempt_count` integer DEFAULT 1 NOT NULL,
	`locked_until` text,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `login_attempts_ip_or_user_key_unique` ON `login_attempts` (`ip_or_user_key`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `r2_cleanup_queue` (
	`id` text PRIMARY KEY,
	`r2_key` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_r2_cleanup_queue_key` ON `r2_cleanup_queue` (`r2_key`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vehicle_images` (
	`id` text PRIMARY KEY,
	`vehicle_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`public_url` text NOT NULL,
	`is_cover` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `vehicle_images_r2_key_unique` ON `vehicle_images` (`r2_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_vehicle_images_vehicle` ON `vehicle_images` (`vehicle_id`,"is_cover" DESC,"sort_order" ASC);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vehicles` (
	`id` text PRIMARY KEY,
	`slug` text NOT NULL,
	`brand` text NOT NULL,
	`title` text NOT NULL,
	`year` integer NOT NULL,
	`km` integer DEFAULT 0 NOT NULL,
	`fuel` text NOT NULL,
	`gear` text NOT NULL,
	`body` text NOT NULL,
	`power` text NOT NULL,
	`color` text NOT NULL,
	`package` text NOT NULL,
	`expertise` text NOT NULL,
	`tramer` text DEFAULT 'Yok' NOT NULL,
	`image_fit` text DEFAULT 'cover' NOT NULL,
	`video_url` text,
	`extras_json` text DEFAULT '[]' NOT NULL,
	`extras_en_json` text DEFAULT '[]' NOT NULL,
	`description_tr` text DEFAULT '' NOT NULL,
	`description_en` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`is_featured` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT "vehicles_year_check" CHECK("vehicles"."year" >= 1900),
	CONSTRAINT "vehicles_km_check" CHECK("vehicles"."km" >= 0),
	CONSTRAINT "vehicles_fuel_check" CHECK(length(trim("vehicles"."fuel")) > 0),
	CONSTRAINT "vehicles_gear_check" CHECK(length(trim("vehicles"."gear")) > 0),
	CONSTRAINT "vehicles_body_check" CHECK(length(trim("vehicles"."body")) > 0),
	CONSTRAINT "vehicles_image_fit_check" CHECK("vehicles"."image_fit" IN ('contain', 'cover')),
	CONSTRAINT "vehicles_status_check" CHECK("vehicles"."status" IN ('active', 'sold', 'draft'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `vehicles_slug_unique` ON `vehicles` (`slug`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_vehicles_vitrin` ON `vehicles` (`status`,"is_featured" DESC,"created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_vehicles_status_brand` ON `vehicles` (`status`,`brand`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_vehicles_year` ON `vehicles` ("year" DESC);