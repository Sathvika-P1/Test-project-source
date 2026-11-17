CREATE TABLE orders (
  id               text PRIMARY KEY,
  customer_name    text NOT NULL,
  customer_email   text NOT NULL,
  delivery_address text NOT NULL,
  payment_summary  text NOT NULL,
  total_minor      integer NOT NULL CHECK (total_minor >= 0),
  currency         char(3) NOT NULL DEFAULT 'INR',
  status           text NOT NULL DEFAULT 'placed'
                   CHECK (status IN ('placed', 'packed', 'shipped', 'delivered', 'cancelled')),
  placed_at        timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_placed_at_idx ON orders (placed_at DESC);

CREATE TABLE order_items (
  order_id    text NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  position    integer NOT NULL,
  name        text NOT NULL,
  detail      text NOT NULL DEFAULT '',
  price_minor integer NOT NULL CHECK (price_minor >= 0),
  PRIMARY KEY (order_id, position)
);

-- One support request per order for this release.
CREATE TABLE support_requests (
  id         bigserial PRIMARY KEY,
  order_id   text NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
  subject    text NOT NULL,
  message    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
