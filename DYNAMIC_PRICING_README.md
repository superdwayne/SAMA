# Dynamic Pricing Implementation

## Overview

This implementation allows you to dynamically display pricing options from Stripe, with automatic detection of the default price (prioritizing recurring subscriptions) and support for multiple pricing tiers per region.

## Features

- ✅ **Dynamic Price Fetching**: Real-time prices from Stripe API
- ✅ **Default Price Detection**: Automatically identifies the default pricing option
- ✅ **Multiple Pricing Tiers**: Support for recurring and one-time pricing
- ✅ **Fallback System**: Graceful degradation when API fails
- ✅ **Responsive Design**: Works on all device sizes
- ✅ **Type Safety**: Proper error handling and validation

## Quick Start

### 1. Get Your Product IDs

First, run the utility script to extract product IDs from your existing Stripe prices:

```bash
# Set your Stripe secret key
export STRIPE_SECRET_KEY=sk_live_your_key_here

# Run the script
node get-product-ids.js
```

This will output the product IDs you need to update in `src/utils/pricing.js`.

### 2. Update Product IDs

Replace the placeholder product IDs in `src/utils/pricing.js`:

```javascript
export const REGION_PRODUCT_IDS = {
  'centre': 'prod_actual_id_here',
  'center': 'prod_actual_id_here',
  'noord': 'prod_actual_id_here',
  // ... etc
};
```

### 3. Deploy the API

Deploy your updated API to Vercel:

```bash
vercel --prod
```

### 4. Test the Component

Add the test component to your app temporarily:

```jsx
import DynamicPricingTest from './components/DynamicPricingTest';

// In your App.jsx or a test route
<DynamicPricingTest />
```

## API Endpoints

### GET /api/get-price

Fetches pricing information from Stripe.

**Parameters:**
- `priceId` (optional): Specific price ID to fetch
- `productId` (optional): Product ID to fetch all pricing options

**Response:**
```json
{
  "id": "price_1234567890",
  "amount": 695,
  "currency": "EUR",
  "formattedPrice": "€6,95",
  "recurring": {
    "interval": "month",
    "intervalCount": 2,
    "formattedInterval": "Every 2 months"
  },
  "isDefault": true,
  "allPrices": [
    {
      "id": "price_1234567890",
      "type": "recurring",
      "amount": 695,
      "currency": "EUR",
      "formattedPrice": "€6,95",
      "recurring": {
        "interval": "month",
        "intervalCount": 2,
        "formattedInterval": "Every 2 months"
      },
      "isDefault": true
    },
    {
      "id": "price_1234567891",
      "type": "one_time",
      "amount": 800,
      "currency": "EUR",
      "formattedPrice": "€8,00",
      "recurring": null,
      "isDefault": false
    }
  ]
}
```

## Components

### DynamicPricing

The main component for displaying pricing options.

**Props:**
- `regionId` (string): The region identifier
- `onPriceSelect` (function): Callback when a price is selected

**Usage:**
```jsx
import DynamicPricing from './components/DynamicPricing';

<DynamicPricing 
  regionId="centre" 
  onPriceSelect={(price) => console.log('Selected:', price)}
/>
```

### DynamicPricingTest

A test component for development and debugging.

**Usage:**
```jsx
import DynamicPricingTest from './components/DynamicPricingTest';

<DynamicPricingTest />
```

## Utility Functions

### fetchAllRegionPrices(regionId)

Fetches all pricing options for a region.

```javascript
import { fetchAllRegionPrices } from './utils/pricing';

const prices = await fetchAllRegionPrices('centre');
console.log(prices.allPrices); // Array of all pricing options
```

### fetchDefaultRegionPrice(regionId)

Fetches only the default price for a region.

```javascript
import { fetchDefaultRegionPrice } from './utils/pricing';

const defaultPrice = await fetchDefaultRegionPrice('centre');
console.log(defaultPrice.formattedPrice); // "€6,95"
```

## Integration Examples

### Replace Static Pricing in Payment Component

```jsx
// Before (static)
const price = '€4,99';

// After (dynamic)
const [price, setPrice] = useState(null);

useEffect(() => {
  const loadPrice = async () => {
    const priceData = await fetchDefaultRegionPrice(regionId);
    setPrice(priceData.formattedPrice);
  };
  loadPrice();
}, [regionId]);
```

### Add to Region Detail Page

```jsx
import DynamicPricing from './components/DynamicPricing';

// In your region detail component
<DynamicPricing 
  regionId={region.id}
  onPriceSelect={(selectedPrice) => {
    // Handle price selection
    console.log('User selected:', selectedPrice.formattedPrice);
  }}
/>
```

## Styling

The component uses CSS classes that can be customized:

- `.dynamic-pricing`: Main container
- `.pricing-option`: Individual pricing option
- `.pricing-option.default`: Default pricing option
- `.pricing-option.selected`: Currently selected option
- `.badge.default-badge`: Default price badge
- `.badge.alternative-badge`: Alternative price badge

## Error Handling

The system includes multiple fallback levels:

1. **Primary**: Dynamic price from Stripe API
2. **Secondary**: Region-specific fallback price
3. **Tertiary**: Generic €4,99 fallback

All errors are logged to the console for debugging.

## Performance Considerations

- **Caching**: API responses are cached for 5 minutes
- **Lazy Loading**: Prices are fetched only when needed
- **Fallbacks**: No loading delays due to fallback system
- **Optimization**: Minimal re-renders with proper state management

## Troubleshooting

### Common Issues

1. **"No pricing options available"**
   - Check that product IDs are correct in `pricing.js`
   - Verify Stripe API key is set correctly
   - Check browser console for API errors

2. **"Failed to load pricing options"**
   - Verify API endpoint is deployed and accessible
   - Check network tab for failed requests
   - Ensure CORS is configured correctly

3. **Prices not updating**
   - Clear browser cache
   - Check Vercel deployment status
   - Verify Stripe price is active

### Debug Mode

Enable detailed logging by checking the browser console. All API calls and responses are logged with emojis for easy identification.

## Migration Guide

### From Static Pricing

1. Replace hardcoded prices with `fetchDefaultRegionPrice()`
2. Update components to handle async price loading
3. Add loading states where needed
4. Test fallback scenarios

### From Single Price API

1. Update API calls to use `fetchAllRegionPrices()`
2. Handle the new response structure with `allPrices` array
3. Update UI to display multiple options
4. Add price selection logic

## Future Enhancements

- [ ] Price comparison features
- [ ] Discount code integration
- [ ] A/B testing for pricing
- [ ] Analytics tracking
- [ ] Multi-currency support
- [ ] Seasonal pricing
- [ ] Bulk pricing options

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify your Stripe configuration
3. Test with the `DynamicPricingTest` component
4. Review the API logs in Vercel dashboard 