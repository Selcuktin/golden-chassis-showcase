ALTER TABLE `vehicles` ADD `sort_order` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Preserve the visible ordering while adopting a persistent administrator order.
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY is_featured DESC, updated_at DESC, id) - 1 AS position
  FROM vehicles
)
UPDATE vehicles SET sort_order = (SELECT position FROM ranked WHERE ranked.id = vehicles.id);
