-- Retire credentials created by the old public, deterministic seed. A public
-- salt is not itself a secret; this exact value identifies the legacy seed.
-- Revoke sessions explicitly before deleting users so reusing admin-master on
-- the next ADMIN_PASSWORD login cannot revive tokens issued before the repair.
DELETE FROM admin_sessions
WHERE admin_id IN (
  SELECT id FROM admin_users
  WHERE password_salt = 'bycar-global-vip-salt-2026'
);
--> statement-breakpoint
DELETE FROM admin_users
WHERE password_salt = 'bycar-global-vip-salt-2026';
