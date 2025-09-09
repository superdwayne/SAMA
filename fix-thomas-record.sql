-- Fix for thomasmendes@hotmail.com South region purchase
-- Run this in your Supabase SQL editor

-- Update the user's region from Centre to South
UPDATE users 
SET 
  regions = ARRAY['South'],
  updated_at = NOW()
WHERE email = 'thomasmendes@hotmail.com' 
  AND regions = ARRAY['Centre'];

-- Update any purchase history records from the specific session
UPDATE purchase_history 
SET region = 'South'
WHERE user_id = (SELECT id FROM users WHERE email = 'thomasmendes@hotmail.com')
  AND stripe_session_id = 'cs_live_a1bL8RTIguAByyVHFhE63ui3puCzVhbei9l7bFrn45U7trezavU24qQzMr';

-- Verify the fix
SELECT 
  email,
  regions,
  regions_expires_at,
  total_spent,
  updated_at
FROM users 
WHERE email = 'thomasmendes@hotmail.com';

-- Also check purchase history
SELECT 
  ph.region,
  ph.amount,
  ph.stripe_session_id,
  ph.purchased_at,
  u.email
FROM purchase_history ph
JOIN users u ON u.id = ph.user_id
WHERE u.email = 'thomasmendes@hotmail.com'
ORDER BY ph.purchased_at DESC;
