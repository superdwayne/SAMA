/**
 * Price configuration and utilities for Amsterdam Street Art Map
 * Centralizes price IDs and fallback pricing for all regions
 */

// Stripe Price IDs for each region
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

// Fallback prices (used when Stripe API fails)
// These should match the actual Stripe prices
export const FALLBACK_PRICES = {
  'centre': '€4,99',
  'center': '€4,99',
  'noord': '€5,99',
  'north': '€5,99',
  'east': '€4,99',
  'nieuw-west': '€3,99',
  'new-west': '€3,99',
  'south': '€7,00',
  'zuid': '€7,00',
  'south-east': '€5,49',
  'west': '€4,49'
};

/**
 * Fetches dynamic price from Stripe API for a given region
 * @param {string} regionId - The region identifier
 * @returns {Promise<Object>} Price object with formattedPrice property
 */
export const fetchRegionPrice = async (regionId) => {
  try {
    const priceId = REGION_PRICE_IDS[regionId];
    
    if (!priceId) {
      console.warn('⚠️ No price ID found for region:', regionId);
      return { formattedPrice: FALLBACK_PRICES[regionId] || '€4,99' };
    }

    console.log('💰 Fetching price for region:', regionId, 'with price ID:', priceId);
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    console.log('🌐 API URL being used:', API_URL);
    
    const fetchUrl = `${API_URL}/get-price?priceId=${encodeURIComponent(priceId)}`;
    console.log('📡 Fetching from:', fetchUrl);
    
    const response = await fetch(fetchUrl);
    
    if (response.ok) {
      const priceData = await response.json();
      console.log('💰 Price data received from Stripe:', priceData);
      return priceData;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to fetch price from API:', response.status, response.statusText, errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Error fetching price for region', regionId, ':', error);
    // Return fallback price
    return { formattedPrice: FALLBACK_PRICES[regionId] || '€4,99' };
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
 * Gets the fallback price for a given region
 * @param {string} regionId - The region identifier
 * @returns {string} The formatted fallback price
 */
export const getFallbackPrice = (regionId) => {
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
    fallbackPrice: FALLBACK_PRICES[id]
  }));
};
