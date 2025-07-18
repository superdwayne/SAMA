# Vercel Deployment Guide (Updated)

## 🚀 Deploy to Production

### 1. Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 2. Deploy to Vercel
```bash
vercel --prod
```

## 🔧 Environment Variables Setup

### Required Environment Variables

You need to set these in your Vercel dashboard:

1. **RESEND_API_KEY** - For magic link emails
   - Get this from your Resend dashboard
   - Should start with `re_`

### How to Set Environment Variables in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the variable:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_your_resend_api_key_here`
   - **Environment**: Production, Preview, Development

5. Click **Save**
6. Redeploy your project

## 💰 Pricing Strategy

### Static Price Data
To avoid Vercel Hobby plan serverless function limits (max 12 functions), we use static price data:

- **Centre**: €4,99
- **North**: €5,99  
- **East**: €4,99
- **Nieuw-West**: €3,99
- **South**: €7.00
- **South-East**: €5,49
- **West**: €4,49

### Benefits:
- ✅ No serverless function limits
- ✅ Faster loading (no API calls)
- ✅ Works immediately in production
- ✅ No Stripe API dependencies

### Updating Prices:
To change prices, edit `src/utils/api.js` and update the `STATIC_PRICES` object.

## 🧪 Testing

### Test the Application
1. Visit your deployed site
2. Navigate to any region's payment page
3. Verify prices display correctly
4. Test the payment flow

### Expected Behavior:
- Prices load instantly (no API calls)
- No fallback warnings
- Smooth payment experience

## 🔍 Troubleshooting

### If prices don't show:
1. Check browser console for errors
2. Verify the price IDs in `src/utils/api.js` match your Stripe price IDs
3. Ensure the application is deployed correctly

### If magic links don't work:
1. Verify `RESEND_API_KEY` is set in Vercel
2. Check Vercel function logs for email sending errors

## 🎯 Production Checklist

- [ ] Environment variables set in Vercel (RESEND_API_KEY)
- [ ] Static prices configured correctly
- [ ] Frontend displays prices correctly
- [ ] Magic link emails are working
- [ ] Payment flow works end-to-end
- [ ] No serverless function limit errors

## 📞 Support

If you're still having issues:

1. Check browser console for errors
2. Verify environment variables are set correctly
3. Ensure price IDs match between frontend and Stripe
4. Test magic link functionality

## 🔄 Updating Prices

To update prices in the future:

1. Edit `src/utils/api.js`
2. Update the `STATIC_PRICES` object
3. Deploy to Vercel: `vercel --prod`

This approach keeps you well under the 12 serverless function limit while providing a smooth user experience! 🎉 