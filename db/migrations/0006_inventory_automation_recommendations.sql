CREATE TABLE IF NOT EXISTS inventory_automation_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('low_stock_prediction', 'reorder_recommendation', 'fulfillment_priority')),
  recommendation_title TEXT NOT NULL,
  recommendation_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'applied', 'dismissed')),
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_automation_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES inventory_automation_recommendations(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('forecast_recalculation', 'recommendation_applied')),
  action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation_count INTEGER NOT NULL DEFAULT 0,
  triggered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_automation_recommendations_user_status
  ON inventory_automation_recommendations (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_automation_recommendations_product
  ON inventory_automation_recommendations (product_id, recommendation_type);

CREATE INDEX IF NOT EXISTS idx_inventory_automation_execution_logs_user_created
  ON inventory_automation_execution_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_automation_execution_logs_recommendation
  ON inventory_automation_execution_logs (recommendation_id);
