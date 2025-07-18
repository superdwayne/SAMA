# Dynamic Pricing Implementation

## Overview
Implemented dynamic pricing system that pulls real-time prices from Stripe per region for the Amsterdam Street Art Map.

## Files Created/Modified

### 1. `/api/get-price.js` (NEW)
- Vercel serverless function that fetches prices from Stripe
- Takes `priceId` as query parameter
- Returns formatted price data in EUR format
- Includes proper error handling and caching headers
- Uses ES modules (compatible with the existing API setup)

### 2. `/src/utils/pricing.js` (NEW)
- Centralized pricing configuration
- Contains all Stripe Price IDs for each region
- Includes fallback prices (used when API fails)
- Utility functions for price management:
  - `fetchRegionPrice(regionId)` - Main function to get dynamic prices
  - `getRegionPriceId(regionId)` - Get price ID for a region
  - `getFallbackPrice(regionId)` - Get fallback price
  - `getAllRegionsWithPrices()` - Get all regions with pricing data

### 3. `/src/pages/RegionDetailPage.jsx` (MODIFIED)
- Updated to use the new pricing utility
- Simplified price fetching logic
- Better error handling and logging
- Fallback prices per region (instead of generic €4,99)
- More detailed console logging for debugging

### 4. `/test-pricing.js` (NEW)
- Test script to verify pricing API functionality
- Tests all regions and their price IDs
- Provides summary of working/failing endpoints
- Can be run with `node test-pricing.js`

## Price Configuration

### Current Price IDs per Region:
```javascript
'centre': 'price_1RlrHzJ3urOr8HD7UDo4U0vY',     // €4,99
'noord': 'price_1RlrKYJ3urOr8HD7HzOpJ8bJ',      // €5,99
'east': 'price_1RbeqUJ3urOr8HD7ElBhh5rB',        // €4,99
'nieuw-west': 'price_1Rbf2kJ3urOr8HD7QTcbJLSo',  // €3,99
'south': 'price_1RbeqwJ3urOr8HD7Rf6mUldT',       // €7,00
'south-east': 'price_1Rbf8wJ3urOr8HD7gvLlK0aa',  // €5,49
'west': 'price_1Rbf23J3urOr8HD7gxyHwFW0'         // €4,49
```

### Region Aliases Supported:
- `center` → `centre`
- `north` → `noord`
- `new-west` → `nieuw-west`
- `zuid` → `south`

## How It Works

1. **User visits region page** (e.g., `/region/centre`)
2. **RegionDetailPage loads** and identifies the region
3. **Price fetching starts** using `fetchRegionPrice(regionId)`
4. **API call made** to `/api/get-price?priceId=price_xxx`
5. **Stripe API called** by the serverless function
6. **Price returned** and displayed to user
7. **Fallback used** if any step fails

## Error Handling

### Multiple Fallback Levels:
1. **Primary**: Dynamic price from Stripe API
2. **Secondary**: Region-specific fallback price
3. **Tertiary**: Generic €4,99 fallback

### Logging:
- All price fetch attempts are logged to console
- API URL and fetch URL are logged for debugging
- Error details are logged for troubleshooting

## Testing

### Manual Testing:
```bash
# Test pricing API directly
curl "https://amsterdamstreetart-ow027wxkh-dpms-projects-8cd1083b.vercel.app/api/get-price?priceId=price_1RlrHzJ3urOr8HD7UDo4U0vY"

# Run automated test
node test-pricing.js
```

### Browser Testing:
1. Open any region page (e.g., `/region/centre`)
2. Check browser console for pricing logs
3. Verify price displays correctly
4. Test with different regions

## Environment Variables Required

### Frontend (.env.local):
```bash
VITE_API_URL=https://amsterdamstreetart-ow027wxkh-dpms-projects-8cd1083b.vercel.app/api
```

### Backend (.env):
```bash
STRIPE_SECRET_KEY=sk_live_...
```

## Deployment

### After making changes:
```bash
# Deploy to Vercel
vercel --prod

# Test the deployment
node test-pricing.js
```

## Monitoring

### What to Watch:
- Console logs for price fetch attempts
- Fallback usage (indicates API issues)
- Network errors in browser dev tools
- Vercel function logs for API errors

### Common Issues:
1. **CORS errors**: Check Vercel deployment
2. **404 on API**: Verify vercel.json routing
3. **Stripe errors**: Check price IDs and API key
4. **Fallback prices**: API might be down or misconfigured

## Future Improvements

### Potential Enhancements:
1. **Price caching**: Cache prices for better performance
2. **Currency conversion**: Support multiple currencies
3. **A/B testing**: Different prices for different users
4. **Price analytics**: Track price effectiveness
5. **Admin interface**: Update prices without code changes

## Maintenance

### Updating Prices:
1. **Change in Stripe**: Update prices in Stripe dashboard
2. **Update fallbacks**: Modify `/src/utils/pricing.js`
3. **Test changes**: Run `node test-pricing.js`
4. **Deploy**: `vercel --prod`

### Adding New Regions:
1. **Create price in Stripe**: Get new price ID
2. **Update pricing.js**: Add to `REGION_PRICE_IDS` and `FALLBACK_PRICES`
3. **Update payment links**: Add to `RegionDetailPage.jsx` stripe links
4. **Test**: Verify new region works

## Support

If pricing isn't working:
1. Check browser console for errors
2. Run `node test-pricing.js` to test API
3. Verify environment variables are set
4. Check Vercel function logs
5. Ensure Stripe price IDs are valid and active
