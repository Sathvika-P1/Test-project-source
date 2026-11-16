CREATE TABLE IF NOT EXISTS support_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shopper_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  topic TEXT NOT NULL CHECK (topic IN ('Delivery delay','Wrong or damaged item','Refund or return','Cancel or change order','Other')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_requests_created_at_idx ON support_requests (created_at DESC);
