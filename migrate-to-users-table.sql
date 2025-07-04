-- Migration script to consolidate your existing data into the new structure

-- Step 1: Create the new tables (run this first)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  regions TEXT[] DEFAULT '{}',
  total_spent INTEGER DEFAULT 0,
  first_purchase_at TIMESTAMPTZ,
  last_purchase_at TIMESTAMPTZ,
  magic_token TEXT,
  magic_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  region TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'eur',
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_magic_token ON users(magic_token);
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_stripe_session ON purchase_history(stripe_session_id);

-- Step 2: Migrate existing purchase data
INSERT INTO users (email, regions, total_spent, first_purchase_at, last_purchase_at)
SELECT 
  customer_email,
  ARRAY_AGG(DISTINCT region) as regions,
  SUM(amount) as total_spent,
  MIN(created_at) as first_purchase_at,
  MAX(created_at) as last_purchase_at
FROM purchases 
GROUP BY customer_email
ON CONFLICT (email) DO UPDATE SET
  regions = EXCLUDED.regions,
  total_spent = EXCLUDED.total_spent,
  first_purchase_at = LEAST(users.first_purchase_at, EXCLUDED.first_purchase_at),
  last_purchase_at = GREATEST(users.last_purchase_at, EXCLUDED.last_purchase_at);

-- Step 3: Migrate purchase history
INSERT INTO purchase_history (user_id, stripe_session_id, stripe_payment_intent_id, region, amount, currency, purchased_at)
SELECT 
  u.id,
  p.stripe_session_id,
  p.stripe_payment_intent_id,
  p.region,
  p.amount,
  p.currency,
  p.created_at
FROM purchases p
JOIN users u ON u.email = p.customer_email;

-- Step 4: Check the results
SELECT 
  email,
  regions,
  total_spent,
  array_length(regions, 1) as region_count,
  first_purchase_at,
  last_purchase_at
FROM users 
ORDER BY last_purchase_at DESC;

-- Step 5: Show purchase history count
SELECT 
  u.email,
  COUNT(ph.*) as purchase_count,
  u.regions
FROM users u
LEFT JOIN purchase_history ph ON ph.user_id = u.id
GROUP BY u.id, u.email, u.regions
ORDER BY purchase_count DESC;

-- After confirming everything looks good, you can drop the old tables:
-- DROP TABLE purchases;
-- DROP TABLE magic_links;
