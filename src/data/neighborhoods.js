export const getCategoryColor = (category) => {
  const colors = {
    historic: '#FF6B6B',     // Red for historic/central
    industrial: '#4ECDC4',   // Teal for industrial/north
    residential: '#45B7D1',  // Blue for residential/west
    multicultural: '#96CEB4', // Green for multicultural/east
    upscale: '#FECA57',      // Gold for upscale/south
    community: '#FF9FF3',    // Pink for community/southeast
    emerging: '#54A0FF'      // Light blue for emerging/nieuw-west
  };
  return colors[category] || '#FFFF00';
};export const neighborhoodDescriptions = {
  'Centre': {
    shortName: 'Central',
    description: 'Tags, tourists, and tradition — the city\'s creative heart.',
    position: { lng: 4.8975, lat: 52.3725 },
    category: 'historic',
    icon: '🏛️'
  },
  'North': {
    shortName: 'Noord', 
    description: 'Paint space from the GROBA to a new canvas for expression.',
    position: { lng: 4.9000, lat: 52.4000 },
    category: 'industrial',
    icon: '🏭'
  },
  'West': {
    shortName: 'West',
    description: 'Where tower blocks dream of murals — space, grit, and revolution.',
    position: { lng: 4.8550, lat: 52.3775 },
    category: 'residential',
    icon: '🏘️'
  },
  'East': {
    shortName: 'East',
    description: 'Where work is poetry — the East side\'s artistic tribe.',
    position: { lng: 4.9400, lat: 52.3675 },
    category: 'multicultural',
    icon: '🌍'
  },
  'South': {
    shortName: 'South',
    description: 'Too slick to be true — but the walls still scream for paint.',
    position: { lng: 4.8850, lat: 52.3500 },
    category: 'upscale',
    icon: '💎'
  },
  'South-East': {
    shortName: 'South-east',
    description: 'Away from speakers, art speaks from concrete in a megaphone.',
    position: { lng: 4.9500, lat: 52.3300 },
    category: 'community',
    icon: '🎭'
  },
  'Nieuw-West': {
    shortName: 'Nieuw-West',
    description: 'Laid-back but loud — street art moves between bikes and balkons.',
    position: { lng: 4.8150, lat: 52.3700 },
    category: 'emerging',
    icon: '🚲'
  }
};

export const getNeighborhoodQRUrl = (neighborhoodName, baseUrl = 'https://amsterdamstreetart.vercel.app') => {
  return `${baseUrl}/route/${neighborhoodName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
};