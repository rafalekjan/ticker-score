CREATE TABLE IF NOT EXISTS setups (
  id BIGSERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  tv_symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('CALL', 'PUT')),
  market_permission TEXT NOT NULL,
  iv_context_tag TEXT NOT NULL,
  expected_move_speed TEXT NOT NULL,
  underlying_price NUMERIC(18, 6) NOT NULL,
  options_chain JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL,
  reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_setups_tv_symbol_created ON setups (tv_symbol, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_setups_status_created ON setups (status, created_at DESC);