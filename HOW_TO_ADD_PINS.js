// Example: How to add a new pin to locations.js

export const streetArtLocations = [
  // ... existing locations ...
  
  // ADD YOUR NEW PIN HERE:
  {
    id: 22, // Next available ID number
    title: 'Your New Street Art Location',
    artist: 'Artist Name',
    description: 'Description of the artwork or location',
    type: 'artwork', // Options: 'artwork', 'gallery', 'museum', 'legal-wall'
    district: 'Centre', // Options: 'Centre', 'North', 'South', 'East', 'West', 'Nieuw-West'
    latitude: 52.3700, // Get from Google Maps
    longitude: 4.8900, // Get from Google Maps
    address: 'Street Address, Amsterdam', // Optional
    openingHours: 'Daily 10:00-18:00', // Optional, for galleries/museums
    year: 2024, // Optional, year created
    image: '/images/your-image.jpg' // Optional, image path
  },

  // Real example - adding a new artwork in Centre:
  {
    id: 22,
    title: 'Colorful Cat Mural',
    artist: 'Local Artist',
    description: 'A vibrant cat mural on the side of a cafe',
    type: 'artwork',
    district: 'Centre',
    latitude: 52.3745,
    longitude: 4.8925,
    address: 'Nieuwmarkt 15',
    year: 2024
  }
];
