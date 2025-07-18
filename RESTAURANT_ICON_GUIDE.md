# Restaurant Icon Integration Guide

The Amsterdam Street Art Map now includes a custom restaurant icon using the `restaurant.png` file from your `public/images/` directory.

## 🍽️ Custom Restaurant Icon Features

### **Icon Types Supported**
The custom restaurant icon will appear for locations with these types:
- `"Food & Drink"` (Mapbox dataset format)
- `"restaurant"` (local data format)
- `"cafe"` (alternative format)
- `"dining"` (alternative format)

### **Icon Implementation**
- **Component**: `RestaurantIcon.jsx` - Custom React component
- **Image**: `/images/restaurant.png` - Your custom dining icon
- **Size**: 32px on map markers, 16px in legend
- **Style**: Orange fork, plate, and knife on black background

## 📍 How to Add Restaurant Locations

### **1. Via Mapbox Dataset (Recommended)**
When adding locations to your Mapbox datasets, set the `type` property to `"Food & Drink"`:

```javascript
const restaurantData = {
  title: "Café Example",
  artist: "Chef Name", 
  description: "Great place for coffee and street art viewing",
  type: "Food & Drink", // This triggers the custom restaurant icon
  district: "Centre",
  latitude: 52.3676,
  longitude: 4.9041,
  address: "Example Street 123",
  openingHours: "9:00-18:00"
};
```

### **2. Via Backend API**
```javascript
import { addLocationToDataset } from './src/utils/mapboxData';

await addLocationToDataset(restaurantData, 'Centre');
```

### **3. Via Web Interface**
Visit `/quick-test` and add a test location with type `"Food & Drink"`.

## 🧪 Testing the Restaurant Icon

### **Browser Console Testing**
Open your app and run these commands in the browser console:

```javascript
// Test restaurant icon logic
window.testRestaurantIcon();

// Add a test restaurant location
window.addTestRestaurant = async () => {
  const testRestaurant = {
    title: "Test Restaurant",
    artist: "Test Chef",
    description: "Test dining location with custom icon",
    type: "Food & Drink",
    district: "Centre",
    latitude: 52.3676,
    longitude: 4.9041
  };
  
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${API_URL}/mapbox/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRestaurant)
    });
    
    if (response.ok) {
      console.log('✅ Test restaurant added successfully!');
      // Refresh the page to see the new icon
      window.location.reload();
    } else {
      console.error('❌ Failed to add restaurant:', response.status);
    }
  } catch (error) {
    console.error('❌ Error adding restaurant:', error);
  }
};
```

## 🎨 Icon Display

### **On the Map**
- Restaurant locations will show the custom orange fork/plate/knife icon
- Icon size: 32px on map markers
- Positioned centrally on the marker dot

### **In the Legend**
- Restaurant icon appears in the map legend
- Icon size: 16px in legend
- Label: "Restaurant"

### **Icon Priority**
The restaurant icon takes priority over emoji icons for dining-related locations:
1. Custom RestaurantIcon (for dining types)
2. Custom ShoppingBagIcon (for shopping types)  
3. Custom BrickWallIcon (for wall types)
4. Emoji icons (for other types)

## 🔧 Technical Details

### **Files Modified**
- `src/components/RestaurantIcon.jsx` - New custom icon component
- `src/components/Map.jsx` - Added restaurant icon logic
- `src/components/MapLegend.jsx` - Added restaurant icon to legend

### **Icon Logic**
```javascript
const shouldUseRestaurantIcon = (type) => {
  const typeLower = type?.toLowerCase();
  const shouldUse = typeLower === 'food & drink' || 
                   typeLower === 'restaurant' || 
                   typeLower === 'cafe' || 
                   typeLower === 'dining';
  return shouldUse;
};
```

### **Component Usage**
```javascript
import RestaurantIcon from './RestaurantIcon';

<RestaurantIcon size={32} />
```

## 🎯 Next Steps

1. **Test the icon**: Use the browser console commands above
2. **Add restaurant data**: Populate your datasets with dining locations
3. **Customize if needed**: Modify the icon size, styling, or supported types
4. **Update legend**: The restaurant icon is already included in the map legend

The custom restaurant icon is now fully integrated and ready to use! 🍽️ 