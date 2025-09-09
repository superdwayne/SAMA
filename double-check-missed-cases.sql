-- Double-check for customers who might have been missed
-- Look for customers where total_spent suggests multiple purchases
-- but regions array length doesn't match

WITH customer_analysis AS (
  SELECT 
    u.email,
    u.regions,
    array_length(u.regions, 1) as region_count,
    u.total_spent,
    COUNT(ph.id) as purchase_count,
    array_agg(DISTINCT ph.region ORDER BY ph.region) as purchased_regions,
    array_length(array_agg(DISTINCT ph.region), 1) as unique_regions_purchased,
    SUM(ph.amount) as calculated_total
  FROM users u
  LEFT JOIN purchase_history ph ON ph.user_id = u.id
  GROUP BY u.id, u.email, u.regions, u.total_spent
)
SELECT 
  email,
  regions as database_regions,
  region_count,
  purchased_regions,
  unique_regions_purchased,
  total_spent,
  calculated_total,
  purchase_count,
  CASE 
    WHEN region_count != unique_regions_purchased THEN '❌ Region count mismatch'
    WHEN total_spent != calculated_total THEN '⚠️ Amount mismatch'
    ELSE '✅ Consistent'
  END as status
FROM customer_analysis
WHERE 
  region_count != unique_regions_purchased OR 
  total_spent != calculated_total OR
  email = 'jesstnt3@gmail.com'
ORDER BY status, email;
