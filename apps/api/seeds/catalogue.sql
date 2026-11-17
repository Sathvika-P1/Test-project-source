INSERT INTO categories (slug, name, sort_order) VALUES
  ('men', 'Men', 1),
  ('women', 'Women', 2),
  ('kids', 'Kids', 3),
  ('home', 'Home', 4),
  ('beauty', 'Beauty', 5),
  ('genz', 'GenZ', 6),
  ('studio', 'Studio', 7),
  ('ethnic-wear', 'Ethnic Wear', 10),
  ('casual-wear', 'Casual Wear', 11),
  ('mens-activewear', 'Men''s Activewear', 12),
  ('womens-activewear', 'Women''s Activewear', 13),
  ('western-wear', 'Western Wear', 14),
  ('sportswear', 'Sportswear', 15),
  ('apparel', 'Apparel', 16),
  ('watch', 'Watch', 17),
  ('skincare', 'Skincare', 18),
  ('fragrance-makeup', 'Fragrance & Makeup', 19)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (slug, name, brand, description, price_cents, category_id, featured)
SELECT v.slug, v.name, v.brand, v.description, v.price_cents, c.id, v.featured
FROM (VALUES
  ('classic-cotton-shirt', 'Classic Cotton Shirt', 'Roadster', 'A breathable cotton shirt for everyday wear.', 129900, 'men', true),
  ('slim-fit-jeans', 'Slim Fit Jeans', 'Levis', 'Stretch denim jeans with a slim fit.', 249900, 'men', false),
  ('floral-summer-dress', 'Floral Summer Dress', 'Libas', 'Light floral dress for warm days.', 179900, 'women', true),
  ('silk-kurta-set', 'Silk Kurta Set', 'Libas', 'Festive silk kurta with matching bottoms.', 349900, 'ethnic-wear', true),
  ('kids-graphic-tee', 'Kids Graphic Tee', 'HRX', 'Soft cotton tee with a playful print.', 59900, 'kids', false),
  ('linen-cushion-cover', 'Linen Cushion Cover', 'Sangam', 'Textured linen cover for sofa cushions.', 79900, 'home', false),
  ('vitamin-c-serum', 'Vitamin C Serum', 'Minimalist', 'Brightening face serum for daily skincare.', 69900, 'skincare', true),
  ('analog-leather-watch', 'Analog Leather Watch', 'Fossil', 'Classic analog watch with a leather strap.', 599900, 'watch', false),
  ('running-shoes', 'Running Shoes', 'Puma', 'Cushioned running shoes for sportswear fans.', 299900, 'sportswear', true),
  ('studio-denim-jacket', 'Studio Denim Jacket', 'Studio', 'Oversized denim jacket.', 459900, 'studio', false),
  ('genz-cargo-pants', 'GenZ Cargo Pants', 'Bewakoof', 'Relaxed cargo pants with utility pockets.', 189900, 'genz', false)
) AS v(slug, name, brand, description, price_cents, category_slug, featured)
JOIN categories c ON c.slug = v.category_slug
ON CONFLICT (slug) DO NOTHING;
