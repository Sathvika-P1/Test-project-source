CREATE TABLE IF NOT EXISTS sub_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  top_level text NOT NULL,
  name text NOT NULL,
  UNIQUE (top_level, name)
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  description text NOT NULL,
  sub_category_id uuid NOT NULL REFERENCES sub_categories(id),
  price_minor integer NOT NULL CHECK (price_minor > 0),
  sizes text[] NOT NULL CHECK (cardinality(sizes) >= 1),
  images text[] NOT NULL CHECK (cardinality(images) BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_sub_category_idx ON products (sub_category_id);

INSERT INTO sub_categories (top_level, name) VALUES
  ('Men', 'Shirts'), ('Men', 'Kurtas'), ('Men', 'Sneakers'),
  ('Women', 'Kurtas'), ('Women', 'Sarees'), ('Women', 'Tops'),
  ('Home', 'Tableware'), ('Home', 'Cushions')
ON CONFLICT (top_level, name) DO NOTHING;
