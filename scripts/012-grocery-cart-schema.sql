-- Grocery cart persistence tables
CREATE TABLE IF NOT EXISTS grocery_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES grocery_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_grocery_cart_items_user_id ON grocery_cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_cart_items_product_id ON grocery_cart_items(product_id);
