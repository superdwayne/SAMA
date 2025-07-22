# Dynamic Region Statistics

This document explains how the Amsterdam Street Art Map now pulls region statistics dynamically from Mapbox datasets instead of using hardcoded values.

## Overview

The application now calculates region statistics (artworks, galleries, legal walls) in real-time from the Mapbox datasets, ensuring that the displayed numbers always reflect the current state of the data.

## How It Works

### 1. Data Source
- Statistics are calculated from the Mapbox datasets for each region
- Each region has its own dataset ID (see `DATASET_CONFIGURATION.md`)
- Data is fetched directly from Mapbox API using the configured datasets

### 2. Statistics Calculation
The system categorizes locations based on their `type` property:
- **Artworks**: Default category for murals, street art, etc.
- **Galleries**: Locations with type containing "gallery" or "museum"
- **Legal Walls**: Locations with type containing "legal" or "wall"

### 3. Caching
- Statistics are cached for 5 minutes to avoid excessive API calls
- Cache can be cleared manually for testing or when data is updated
- Fallback to default values (0) if API calls fail

## Implementation

### Core Functions

#### `calculateRegionStats(specificRegion = null)`
- Fetches data from Mapbox datasets
- Calculates statistics for each region
- Returns object with region statistics

#### `getRegionStats(regionName = null)`
- Cached wrapper around `calculateRegionStats`
- Returns statistics for specific region or all regions
- Handles fallback to default values

#### `clearRegionStatsCache()`
- Clears the statistics cache
- Useful for testing or when data is updated

### Components Updated

1. **RegionDetailPage.jsx**
   - Now uses dynamic statistics instead of hardcoded values
   - Shows loading states while fetching data
   - Displays error message if stats are unavailable

2. **RegionPreview.jsx**
   - Updated to use dynamic statistics
   - Shows loading indicators for stats

3. **regions.js**
   - Removed hardcoded statistics from region definitions
   - Added dynamic statistics functions
   - Maintains region geometry and descriptions

## Testing

### Browser Console
```javascript
// Test region statistics calculation
window.testRegionStats();

// Clear cache and reload stats
window.clearRegionStatsCache();
```

### QuickTest Component
Visit `/quicktest` to run automated tests for region statistics.

## Data Structure

### Region Statistics Object
```javascript
{
  'Centre': {
    artworks: 25,
    galleries: 3,
    legalWalls: 2,
    totalLocations: 30
  },
  'Noord': {
    artworks: 40,
    galleries: 5,
    legalWalls: 4,
    totalLocations: 49
  }
  // ... other regions
}
```

### Location Type Mapping
- `type: "mural"` → counted as artwork
- `type: "gallery"` → counted as gallery
- `type: "museum"` → counted as gallery
- `type: "legal wall"` → counted as legal wall
- `type: "street art"` → counted as artwork

## Benefits

1. **Real-time Accuracy**: Statistics always reflect current dataset state
2. **Automatic Updates**: No manual updates needed when data changes
3. **Consistency**: Same data source for map pins and statistics
4. **Scalability**: Easy to add new regions or modify existing ones
5. **Reliability**: Fallback mechanisms ensure app continues working

## Error Handling

- If Mapbox API is unavailable, defaults to 0 for all statistics
- Loading states show "..." while fetching data
- Error messages appear if statistics cannot be loaded
- Cache prevents excessive API calls during errors

## Future Enhancements

- Add more granular statistics (by artist, year, style)
- Implement real-time updates when datasets change
- Add analytics tracking for statistics views
- Support for custom region boundaries 