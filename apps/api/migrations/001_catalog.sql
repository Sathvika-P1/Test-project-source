CREATE TABLE IF NOT EXISTS top_categories (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  slug     TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subcategories (
  id              SERIAL PRIMARY KEY,
  top_category_id INTEGER NOT NULL REFERENCES top_categories (id),
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60)
);
CREATE UNIQUE INDEX IF NOT EXISTS subcategories_top_name_uq
  ON subcategories (top_category_id, lower(name));

-- Every product is in exactly one sub-category: NOT NULL + RESTRICT keep that true beneath the API.
CREATE TABLE IF NOT EXISTS products (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  brand          TEXT NOT NULL DEFAULT '',
  subcategory_id INTEGER NOT NULL REFERENCES subcategories (id) ON DELETE RESTRICT
);

-- Seed: the fixed top-level categories (idempotent).
INSERT INTO top_categories (name, slug, position) VALUES
  ('Men', 'men', 1), ('Women', 'women', 2), ('Kids', 'kids', 3), ('Home', 'home', 4),
  ('Beauty', 'beauty', 5), ('GenZ', 'genz', 6), ('Studio', 'studio', 7)
ON CONFLICT (slug) DO NOTHING;

-- Seed starter sub-categories only for a top-level category that has none, so staff edits
-- (renames, removals) are never undone by re-running.
INSERT INTO subcategories (top_category_id, name)
SELECT t.id, s.name
FROM (VALUES
  ('men', 'Shirts'), ('men', 'T-shirts'), ('men', 'Jeans'), ('men', 'Jackets'),
  ('women', 'Kurtas'), ('women', 'Sarees'), ('women', 'Dresses'),
  ('kids', 'Tops'), ('kids', 'Playwear'),
  ('home', 'Tea sets'), ('home', 'Cushions'), ('home', 'Bedding'),
  ('beauty', 'Skincare'), ('beauty', 'Fragrance'),
  ('genz', 'Streetwear'), ('genz', 'Accessories')
) AS s (slug, name)
JOIN top_categories t ON t.slug = s.slug
WHERE NOT EXISTS (SELECT 1 FROM subcategories x WHERE x.top_category_id = t.id)
ON CONFLICT DO NOTHING;

-- Seed sample products only into an empty products table.
INSERT INTO products (name, brand, subcategory_id)
SELECT p.name, p.brand, sc.id
FROM (VALUES
  ('Oxford shirt, white', 'Harbour', 'men', 'Shirts'),
  ('Linen shirt, sand', 'Harbour', 'men', 'Shirts'),
  ('Slub cotton tee, indigo', 'Jaipur Loom', 'men', 'T-shirts'),
  ('Straight jeans, washed black', 'Denim Row', 'men', 'Jeans'),
  ('Block-print cotton kurta', 'Jaipur Loom', 'women', 'Kurtas'),
  ('Terracotta tea set', 'Clay & Co', 'home', 'Tea sets')
) AS p (name, brand, slug, sub)
JOIN top_categories t ON t.slug = p.slug
JOIN subcategories sc ON sc.top_category_id = t.id AND sc.name = p.sub
WHERE NOT EXISTS (SELECT 1 FROM products);
