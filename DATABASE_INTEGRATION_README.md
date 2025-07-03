# Amsterdam Street Art Map - Database Integration

This project now includes a complete database-backed authentication system using Supabase, Stripe, and magic links.

## 🎯 System Overview

The new system replaces hardcoded email authentication with a proper database-backed system:

1. **Stripe Payment** → Stores purchase in Supabase database
2. **Purchase Confirmation** → Sends magic link email to customer
3. **Magic Link Authentication** → Validates against database and grants access
4. **Region Access** → Based on actual purchase history

## 🗃️ Database Setup

### 1. Run Database Schema

Execute the SQL in `setup-database.sql` in your Supabase SQL Editor:

```sql
-- Creates two main tables:
-- - purchases: Stores all Stripe purchases
-- - magic_links: Stores temporary magic link tokens
```

### 2. Tables Created

**purchases table:**
- `id` (UUID, primary key)
- `stripe_session_id` (unique identifier from Stripe)
- `customer_email` (buyer's email)
- `region` (purchased region)
- `amount` (price paid in cents)
- `payment_status` (pending/completed/failed)
- `created_at` / `updated_at` timestamps

**magic_links table:**
- `id` (UUID, primary key)
- `email` (recipient email)
- `token` (secure random token)
- `expires_at` (30-minute expiration)
- `used` (boolean flag)

## 🔧 Environment Variables

### Backend (.env)
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SENDGRID_API_KEY=SG....
SENDER_EMAIL=your-email@domain.com
```

### Frontend (.env.local)
```env
# Supabase for frontend
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 🚀 How It Works

### 1. Customer Makes Purchase
- Customer clicks "Buy Region" button
- Redirected to Stripe Checkout
- Pays for access to specific region

### 2. Stripe Webhook Fires
- `/api/stripe/webhook` receives `checkout.session.completed` event
- Extracts customer email and region from Stripe session
- Stores purchase record in `purchases` table
- Generates secure magic link token
- Sends confirmation email with magic link

### 3. Customer Clicks Magic Link
- Magic link contains secure token: `?magic=abc123...`
- Frontend detects magic link parameter
- Calls `/api/validate-magic-link` with token
- API validates token and returns purchased regions
- Frontend saves access data to localStorage
- Customer gets access to purchased regions

### 4. Future Access
- Customer can request new magic link anytime
- System checks `purchases` table for their email
- Only sends magic link if purchases exist
- Magic links expire after 30 minutes

## 🔄 API Endpoints

### POST /api/stripe/webhook
- Handles Stripe webhook events
- Stores purchases in database
- Sends confirmation emails

### POST /api/send-magic-link
- Validates email has purchase history
- Creates new magic link token
- Sends magic link email

### POST /api/validate-magic-link
- Validates magic link token
- Returns purchased regions
- Marks token as used

## 💻 Frontend Changes

### New Authentication Flow
```javascript
// App.jsx now handles magic links automatically
useEffect(() => {
  // Check for magic link in URL
  const magicLinkResult = await handleMagicLinkAuth();
  
  if (magicLinkResult.success) {
    // Grant access to purchased regions
    setUnlockedRegions(magicLinkResult.regions);
  }
}, []);
```

### Updated Auth Utils
- `handleMagicLinkAuth()` - Processes magic links
- `requestMagicLink(email)` - Requests new magic link
- `validateMagicLink(token)` - Validates magic link token

## 🧪 Testing the System

### 1. Test Purchase Flow
1. Make a test purchase using Stripe
2. Use a real email address you can access
3. Complete the payment process
4. Check your email for confirmation

### 2. Test Magic Link
1. Click the magic link in the email
2. Should redirect to your map with access granted
3. Check browser console for authentication logs
4. Verify localStorage contains access data

### 3. Test Repeat Access
1. Try requesting a new magic link with same email
2. Should receive new magic link
3. Old magic links should be invalidated

## 🔒 Security Features

### Magic Link Security
- Tokens are cryptographically random (32 bytes)
- 30-minute expiration
- Single-use only (marked as used after validation)
- Stored securely in database

### Database Security
- Row Level Security (RLS) enabled
- Service role required for modifications
- Indexes for performance
- Automatic cleanup of expired tokens

## 📊 Database Queries

### Check Purchase History
```sql
SELECT * FROM purchases 
WHERE customer_email = 'user@example.com' 
AND payment_status = 'completed';
```

### View Magic Links
```sql
SELECT email, expires_at, used 
FROM magic_links 
WHERE email = 'user@example.com' 
ORDER BY created_at DESC;
```

### Cleanup Expired Links
```sql
DELETE FROM magic_links 
WHERE expires_at < NOW() - INTERVAL '1 day';
```

## 🚨 Migration from Hardcoded System

### Before (Hardcoded)
```javascript
// Old hardcoded email check
const purchasedEmails = {
  'superdwayne@gmail.com': { regions: ['Center'] }
};
```

### After (Database-Backed)
```javascript
// New database query
const purchases = await supabase
  .from('purchases')
  .select('*')
  .eq('customer_email', email)
  .eq('payment_status', 'completed');
```

## 🎉 Benefits

1. **Scalable** - No more hardcoded emails
2. **Secure** - Proper token-based authentication
3. **User-Friendly** - Magic links, no passwords
4. **Traceable** - Full audit trail of purchases
5. **Flexible** - Easy to add new regions/features

## 🛠️ Installation

1. Install dependencies:
```bash
npm install
cd api && npm install
```

2. Set up environment variables (see above)

3. Run database setup SQL

4. Configure Stripe webhook endpoint

5. Test the purchase flow

## 🔧 Troubleshooting

### Common Issues

1. **Magic link not working**
   - Check token hasn't expired (30 minutes)
   - Verify token hasn't been used already
   - Check database connection

2. **Purchase not recorded**
   - Verify Stripe webhook is configured
   - Check webhook secret matches
   - Look at Vercel function logs

3. **Email not sent**
   - Check SendGrid API key
   - Verify sender email is authenticated
   - Check spam folder

### Debug Commands

```bash
# Check webhook endpoint
curl -X POST https://your-domain.com/api/stripe/webhook

# View logs
npm run get-logs

# Test database connection
# (Run in Supabase SQL Editor)
SELECT COUNT(*) FROM purchases;
```

Your Amsterdam Street Art Map now has a professional, scalable authentication system! 🎨
