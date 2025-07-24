/**
 * Price configuration and utilities for Amsterdam Street Art Map
 * Centralizes price IDs and fallback pricing for all regions
 * Enhanced to support dynamic default pricing from Stripe
 */

// Stripe Price IDs for each region (legacy support)
export const REGION_PRICE_IDS = {
  'centre': 'price_1RlrHzJ3urOr8HD7UDo4U0vY',
  'center': 'price_1RlrHzJ3urOr8HD7UDo4U0vY',
  'noord': 'price_1RlrKYJ3urOr8HD7HzOpJ8bJ',
  'north': 'price_1RlrKYJ3urOr8HD7HzOpJ8bJ',
  'east': 'price_1RbeqUJ3urOr8HD7ElBhh5rB',
  'nieuw-west': 'price_1Rbf2kJ3urOr8HD7QTcbJLSo',
  'new-west': 'price_1Rbf2kJ3urOr8HD7QTcbJLSo',
  'south': 'price_1RbeqwJ3urOr8HD7Rf6mUldT',
  'zuid': 'price_1RbeqwJ3urOr8HD7Rf6mUldT',
  'south-east': 'price_1Rbf8wJ3urOr8HD7gvLlK0aa',
  'west': 'price_1Rbf23J3urOr8HD7gxyHwFW0'
};

// Stripe Product IDs for each region (for fetching all pricing options)
export const REGION_PRODUCT_IDS = {
  'centre': 'prod_ShFnt4l36QK9zh',
  'center': 'prod_ShFnt4l36QK9zh',
  'noord': 'prod_ShFqQAvts09YR5',
  'north': 'prod_ShFqQAvts09YR5',
  'east': 'prod_SWiHbyMgva4uAw',
  'nieuw-west': 'prod_SWiT4NKGlGFl0I',
  'new-west': 'prod_SWiT4NKGlGFl0I',
  'south': 'prod_SWiHKhcQXGHtm5',
  'zuid': 'prod_SWiHKhcQXGHtm5',
  'south-east': 'prod_SWiavj9uVLa13Z',
  'west': 'prod_SWiSxGvgwn3e8j'
};

// Fallback prices (used when Stripe API fails)
// These should match the actual Stripe recurring prices (default prices)
export const FALLBACK_PRICES = {
  'centre': '€6,95',
  'center': '€6,95',
  'noord': '€3,95',
  'north': '€3,95',
  'east': '€4,95',
  'nieuw-west': '€3,95',
  'new-west': '€3,95',
  'south': '€5,95',
  'zuid': '€5,95',
  'south-east': '€3,95',
  'west': '€4,95'
};

/**
 * Fetches dynamic price from Stripe API for a given region
 * @param {string} regionId - The region identifier
 * @param {boolean} fetchAllPrices - Whether to fetch all pricing options (default: false)
 * @returns {Promise<Object>} Price object with formattedPrice property
 */
export const fetchRegionPrice = async (regionId, fetchAllPrices = false) => {
  try {
    const priceId = REGION_PRICE_IDS[regionId];
    const productId = REGION_PRODUCT_IDS[regionId];
    
    if (!priceId && !productId) {
      console.warn('⚠️ No price ID or product ID found for region:', regionId);
      throw new Error('No price or product ID configured for region');
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    let fetchUrl;
    if (fetchAllPrices && productId) {
      // Fetch all pricing options for the product
      fetchUrl = `${API_URL}/get-price?productId=${encodeURIComponent(productId)}`;
    } else if (priceId) {
      // Fetch specific price
      fetchUrl = `${API_URL}/get-price?priceId=${encodeURIComponent(priceId)}`;
    } else {
      console.warn('⚠️ No price ID available for region:', regionId);
      throw new Error('No price ID available for region');
    }
    
    const response = await fetch(fetchUrl);
    
    if (response.ok) {
      const priceData = await response.json();
      return priceData;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to fetch price from API:', response.status, response.statusText, errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Error fetching price for region', regionId, ':', error);
    throw error; // Re-throw to let the calling function handle it
  }
};

/**
 * Fetches all pricing options for a region (including default and alternatives)
 * @param {string} regionId - The region identifier
 * @returns {Promise<Object>} Price object with all pricing options
 */
export const fetchAllRegionPrices = async (regionId) => {
  return fetchRegionPrice(regionId, true);
};

/**
 * Gets the default price for a region (prioritizes recurring subscriptions)
 * @param {string} regionId - The region identifier
 * @returns {Promise<Object>} Default price object
 */
export const fetchDefaultRegionPrice = async (regionId) => {
  try {
    const priceData = await fetchAllRegionPrices(regionId);
    
    // If we have all prices, return the default one
    if (priceData.allPrices && priceData.allPrices.length > 0) {
      const defaultPrice = priceData.allPrices.find(p => p.isDefault) || priceData.allPrices[0];
      console.log(`🎯 Default price for ${regionId}: ${defaultPrice.formattedPrice}${defaultPrice.recurring ? ` (${defaultPrice.interval})` : ' (one-time)'}`);
      return {
        ...priceData,
        formattedPrice: defaultPrice.formattedPrice,
        recurring: defaultPrice.recurring,
        id: defaultPrice.id
      };
    }
    
    // Fallback to the main price data
    console.log(`🎯 Default price for ${regionId}: ${priceData.formattedPrice}${priceData.recurring ? ` (${priceData.interval})` : ' (one-time)'}`);
    return priceData;
  } catch (error) {
    console.error(`❌ Failed to fetch default price for ${regionId}:`, error);
    // Only use hardcoded fallback as absolute last resort
    const fallbackPrice = FALLBACK_PRICES[regionId] || '€4,99';
    console.log(`🎯 Using fallback price for ${regionId}: ${fallbackPrice} (Every 2 months)`);
    return {
      formattedPrice: fallbackPrice,
      recurring: true,
      interval: 'Every 2 months',
      fallback: true
    };
  }
};

/**
 * Gets the price ID for a given region
 * @param {string} regionId - The region identifier
 * @returns {string|null} The Stripe price ID or null if not found
 */
export const getRegionPriceId = (regionId) => {
  return REGION_PRICE_IDS[regionId] || null;
};

/**
 * Gets the product ID for a given region
 * @param {string} regionId - The region identifier
 * @returns {string|null} The Stripe product ID or null if not found
 */
export const getRegionProductId = (regionId) => {
  return REGION_PRODUCT_IDS[regionId] || null;
};

/**
 * Gets the fallback price for a given region (only used when Stripe API completely fails)
 * @param {string} regionId - The region identifier
 * @returns {string} The formatted fallback price
 */
export const getFallbackPrice = (regionId) => {
  console.warn(`⚠️ Using hardcoded fallback price for ${regionId} - this should only happen if Stripe API is completely unavailable`);
  return FALLBACK_PRICES[regionId] || '€4,99';
};

/**
 * Gets all available regions with their price IDs
 * @returns {Array} Array of region objects with id and priceId
 */
export const getAllRegionsWithPrices = () => {
  return Object.entries(REGION_PRICE_IDS).map(([id, priceId]) => ({
    id,
    priceId,
    productId: REGION_PRODUCT_IDS[id],
    fallbackPrice: FALLBACK_PRICES[id]
  }));
};
