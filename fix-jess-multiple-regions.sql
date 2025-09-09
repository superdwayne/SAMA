-- Fix for jesstnt3@gmail.com multiple regions purchase
-- This customer bought both West and South but only West was stored

-- First, let's see current state
SELECT 
  email,
  regions,
  regions_expires_at,
  total_spent,
  updated_at
FROM users 
WHERE email = 'jesstnt3@gmail.com';

-- Check purchase history
SELECT 
  ph.region,
  ph.amount,
  ph.stripe_session_id,
  ph.purchased_at,
  u.email
FROM purchase_history ph
JOIN users u ON u.id = ph.user_id
WHERE u.email = 'jesstnt3@gmail.com'
ORDER BY ph.purchased_at;

-- Update user to have BOTH West and South regions
UPDATE users 
SET 
  regions = ARRAY['West', 'South'],
  updated_at = NOW()
WHERE email = 'jesstnt3@gmail.com';

-- Update purchase history for the South purchase
-- We need to find which session was the South purchase (€7.00 = 700 cents)
UPDATE purchase_history 
SET region = 'South'
WHERE user_id = (SELECT id FROM users WHERE email = 'jesstnt3@gmail.com')
  AND amount = 700  -- €7.00 purchase
  AND region != 'South';  -- Only update if not already South

-- Alternative: Update by session ID if you know which one was South
-- UPDATE purchase_history 
-- SET region = 'South'
-- WHERE stripe_session_id = 'cs_live_a1tjeQeu8LGQVm2ZkjSfK90ENnhNTNNgjh9ej634qSuGtf9Q1QTGc2GcDw';

-- Verify the fix
SELECT 
  u.email,
  u.regions,
  u.regions_expires_at,
  u.total_spent,
  COUNT(ph.id) as purchase_count,
  array_agg(DISTINCT ph.region) as purchased_regions,
  array_agg(ph.amount ORDER BY ph.purchased_at) as amounts,
  array_agg(ph.purchased_at ORDER BY ph.purchased_at) as dates
FROM users u
LEFT JOIN purchase_history ph ON ph.user_id = u.id
WHERE u.email = 'jesstnt3@gmail.com'
GROUP BY u.id, u.email, u.regions, u.regions_expires_at, u.total_spent;
