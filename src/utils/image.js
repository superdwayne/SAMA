// src/utils/image.js
// Utility helpers for client-side image handling

/**
 * Convert an arbitrary image URL to an on-the-fly optimized thumbnail using wsrv.nl.
 * The proxy resizes, compresses and converts to WebP, drastically reducing payload size.
 *
 * @param {string} url  Original image URL (absolute or without scheme)
 * @param {number} width Max width in pixels for the resized image (default 1200)
 * @returns {string} Optimized thumbnail URL served by wsrv.nl
 */
export const toOptimizedThumb = (url, width = 800) => {
  if (!url) return url;
  // Remove any leading protocol so we don’t end up with double https:// in the proxy URL
  const clean = url.replace(/^https?:\/\//i, '');
  const encoded = encodeURIComponent(clean);
  return `https://wsrv.nl/?url=${encoded}&w=${width}&output=webp`;
};

// Simple in-memory store mapping region names to a preselected thumbnail URL
const regionThumbCache = {};

export const registerRegionThumb = (regionName, url) => {
  if (regionName && url) {
    regionThumbCache[regionName] = url;
  }
};

export const getRegionThumb = (regionName) => regionThumbCache[regionName]; 