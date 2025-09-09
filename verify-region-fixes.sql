-- Verify that the region fixes were applied successfully
-- Run this to confirm all 3 customers now have correct regions

SELECT 
  email,
  regions,
  array_length(regions, 1) as region_count,
  regions_expires_at,
  CASE 
    WHEN regions_expires_at > NOW() THEN '✅ Active'
    ELSE '❌ Expired'
  END as status,
  total_spent,
  created_at
FROM users 
WHERE email IN (
  'elise.pesce@gmail.com',
  'europeandthecity@gmail.com', 
  'superdwayne@gmail.com'
)
ORDER BY email;

-- Also check their purchase history to ensure it matches
SELECT 
  u.email,
  u.regions as user_regions,
  array_agg(DISTINCT ph.region ORDER BY ph.region) as purchased_regions,
  COUNT(ph.id) as total_purchases,
  SUM(ph.amount) as total_amount,
  CASE 
    WHEN u.regions @> array_agg(DISTINCT ph.region) AND 
         array_agg(DISTINCT ph.region) @> u.regions THEN '✅ Perfect Match'
    WHEN u.regions @> array_agg(DISTINCT ph.region) THEN '⚠️ Extra in User'
    ELSE '❌ Missing from User'
  END as consistency_check
FROM users u
JOIN purchase_history ph ON ph.user_id = u.id
WHERE u.email IN (
  'elise.pesce@gmail.com',
  'europeandthecity@gmail.com', 
  'superdwayne@gmail.com'
)
GROUP BY u.id, u.email, u.regions
ORDER BY u.email;
