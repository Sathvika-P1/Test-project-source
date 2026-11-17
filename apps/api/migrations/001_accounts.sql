CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'shopper' CHECK (role IN ('shopper', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (email);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Keyed by email text (not user id) so an unregistered email behaves identically.
CREATE TABLE login_attempts (
  email text PRIMARY KEY,
  failed_count int NOT NULL DEFAULT 0,
  locked_until timestamptz
);

-- Minimal owner-keyed tables; the bag, Saved and order stories extend them.
CREATE TABLE bag_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity int NOT NULL DEFAULT 1
);
CREATE TABLE saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL
);
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  number text NOT NULL,
  status text NOT NULL
);
CREATE INDEX bag_items_user_idx ON bag_items (user_id);
CREATE INDEX saved_items_user_idx ON saved_items (user_id);
CREATE INDEX orders_user_idx ON orders (user_id);
