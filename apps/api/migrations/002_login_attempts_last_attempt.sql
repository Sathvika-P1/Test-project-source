-- Lets stale failure counts expire and idle rows be purged.
ALTER TABLE login_attempts ADD COLUMN last_attempt_at timestamptz NOT NULL DEFAULT now();
