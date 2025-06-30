// Art Routes - Curated experiences for different interests
export const artRoutes = [
  {
    id: 'classic-masters',
    name: 'Classic Street Art Masters',
    description: 'Legendary artists and iconic pieces that shaped Amsterdam\'s street art scene',
    icon: '🎨',
    color: '#FF6B6B',
    difficulty: 'Easy',
    duration: '2-3 hours',
    distance: '3.2 km',
    highlights: ['Keith Haring mural', 'Eduardo Kobra work', 'STRAAT Museum'],
    locations: [2, 10, 1, 9], // Anne Frank Mural, Keith Haring, STRAAT, MOCO
    startPoint: { lat: 52.3752, lng: 4.8840 },
    districts: ['Centre', 'South'],
    tags: ['legendary-artists', 'must-see', 'history']
  },
  {
    id: 'industrial-underground',
    name: 'Industrial Underground',
    description: 'Raw street art in Amsterdam\'s industrial areas and alternative spaces',
    icon: '🏭',
    color: '#4ECDC4',
    difficulty: 'Moderate',
    duration: '3-4 hours',
    distance: '5.1 km',
    highlights: ['NDSM Wharf', 'Legal walls', 'Giant robot mural'],
    locations: [5, 6, 7, 15, 16], // NDSM locations + Westerpark
    startPoint: { lat: 52.4020, lng: 4.8950 },
    districts: ['North', 'West'],
    tags: ['industrial', 'underground', 'legal-walls']
  },
  {
    id: 'cultural-heritage',
    name: 'Cultural Heritage Route',
    description: 'Street art celebrating Amsterdam\'s diverse communities and history',
    icon: '🌍',
    color: '#95E1D3',
    difficulty: 'Easy',
    duration: '2-3 hours',
    distance: '2.8 km',
    highlights: ['Multicultural murals', 'Community art', 'Heritage celebrations'],
    locations: [12, 13, 18, 19], // Javastraat, Dappermarkt, Bijlmer locations
    startPoint: { lat: 52.3625, lng: 4.9380 },
    districts: ['East', 'South-East'],
    tags: ['cultural', 'community', 'heritage']
  },
  {
    id: 'emerging-artists',
    name: 'Emerging Artists Trail',
    description: 'Discover the next generation of street artists in Amsterdam\'s newest art spots',
    icon: '🌟',
    color: '#A8E6CF',
    difficulty: 'Moderate',
    duration: '2-3 hours',
    distance: '4.0 km',
    highlights: ['New generation work', 'Fresh styles', 'Upcoming talents'],
    locations: [20, 21, 14, 17], // Nieuw-West and some newer pieces
    startPoint: { lat: 52.3580, lng: 4.8150 },
    districts: ['Nieuw-West', 'East', 'West'],
    tags: ['emerging', 'contemporary', 'new-talent']
  },
  {
    id: 'gallery-hop',
    name: 'Gallery & Museum Hop',
    description: 'Tour the best street art galleries and museums in Amsterdam',
    icon: '🏛️',
    color: '#FFB6C1',
    difficulty: 'Easy',
    duration: '4-5 hours',
    distance: '2.5 km',
    highlights: ['STRAAT Museum', 'MOCO Museum', 'Contemporary galleries'],
    locations: [1, 9, 4, 8, 11, 16], // All museums and galleries
    startPoint: { lat: 52.3840, lng: 4.8987 },
    districts: ['Centre', 'South', 'North', 'West'],
    tags: ['museums', 'galleries', 'curated', 'indoor']
  },
  {
    id: 'legal-walls-tour',
    name: 'Legal Walls Adventure',
    description: 'Explore Amsterdam\'s legal graffiti spots and see art in progress',
    icon: '🎪',
    color: '#DDA0DD',
    difficulty: 'Challenging',
    duration: '3-4 hours',
    distance: '6.2 km',
    highlights: ['Active legal walls', 'Watch artists work', 'Interactive spots'],
    locations: [3, 7, 14, 17, 21], // All legal walls
    startPoint: { lat: 52.3780, lng: 4.8820 },
    districts: ['Centre', 'North', 'East', 'West', 'Nieuw-West'],
    tags: ['legal-walls', 'interactive', 'active-art']
  }
];

// Route difficulty levels
export const routeDifficulty = {
  'Easy': {
    description: 'Mostly accessible areas, short walks between locations',
    icon: '🚶‍♂️',
    color: '#4CAF50'
  },
  'Moderate': {
    description: 'Some walking required, mixed terrain, ferry rides possible',
    icon: '🚶‍♂️🚴‍♂️',
    color: '#FF9800'
  },
  'Challenging': {
    description: 'Longer distances, multiple districts, full day adventure',
    icon: '🚴‍♂️🗺️',
    color: '#F44336'
  }
};

// Helper functions
export const getRouteLocations = (routeId, allLocations) => {
  const route = artRoutes.find(r => r.id === routeId);
  if (!route) return [];
  
  return route.locations.map(locationId => 
    allLocations.find(loc => loc.id === locationId)
  ).filter(Boolean);
};

export const getRoutesByDifficulty = (difficulty) => {
  return artRoutes.filter(route => route.difficulty === difficulty);
};

export const getRoutesByDistrict = (district) => {
  return artRoutes.filter(route => route.districts.includes(district));
};

export const getRoutesByTag = (tag) => {
  return artRoutes.filter(route => route.tags.includes(tag));
};

// Calculate actual route distance using coordinates
export const calculateRouteDistance = (locations) => {
  if (locations.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    const start = locations[i];
    const end = locations[i + 1];
    
    // Haversine formula for distance between two points
    const R = 6371; // Earth's radius in km
    const dLat = (end.latitude - start.latitude) * Math.PI / 180;
    const dLng = (end.longitude - start.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(start.latitude * Math.PI / 180) * Math.cos(end.latitude * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    totalDistance += distance;
  }
  
  return Math.round(totalDistance * 10) / 10; // Round to 1 decimal place
};
