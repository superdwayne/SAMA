-- Find all customers who might have wrong regions due to payment link metadata issue
-- Run this in your Supabase SQL editor

-- Check for users with "Centre" region who might have purchased different regions
WITH recent_purchases AS (
  SELECT DISTINCT
    customer_email,
    region,
    stripe_session_id,
    created_at
  FROM purchases 
  WHERE created_at >= '2025-08-01' -- Check last month
  ORDER BY created_at DESC
),
recent_users AS (
  SELECT 
    email,
    regions,
    regions_expires_at,
    created_at
  FROM users
  WHERE created_at >= '2025-08-01'
)

-- Show users who have Centre but might have purchased other regions
SELECT 
  u.email,
  u.regions,
  u.regions_expires_at,
  CASE 
    WHEN u.regions_expires_at > NOW() THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as status,
  u.created_at as user_created,
  
  -- Show any purchase history
  ph.region as purchased_region,
  ph.stripe_session_id,
  ph.purchased_at
  
FROM users u
LEFT JOIN purchase_history ph ON ph.user_id = u.id
WHERE u.regions && ARRAY['Centre']  -- Users with Centre region
ORDER BY u.created_at DESC;

-- Also check for potential mismatches between users.regions and purchase_history.region
SELECT 
  u.email,
  u.regions as user_regions,
  array_agg(DISTINCT ph.region) as purchased_regions,
  CASE 
    WHEN u.regions @> array_agg(DISTINCT ph.region) THEN 'MATCH'
    ELSE 'MISMATCH'
  END as status
FROM users u
JOIN purchase_history ph ON ph.user_id = u.id
GROUP BY u.id, u.email, u.regions
HAVING NOT (u.regions @> array_agg(DISTINCT ph.region))
ORDER BY u.email;
