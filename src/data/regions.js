export const amsterdamRegions = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Centre',
        description: 'The historic heart of Amsterdam, featuring iconic canals and vibrant street art in unexpected corners.',
        artworkCount: 25,
        galleryCount: 3,
        legalWallCount: 2,
        artistCount: 15,
        featuredInfo: 'Home to STRAAT Museum and numerous hidden gems in the Jordaan neighborhood.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.8850, 52.3800],
          [4.9100, 52.3800],
          [4.9100, 52.3650],
          [4.8850, 52.3650],
          [4.8850, 52.3800]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'North',
        description: 'Amsterdam Noord is the street art capital with massive murals and the famous NDSM wharf.',
        artworkCount: 40,
        galleryCount: 5,
        legalWallCount: 4,
        artistCount: 25,
        featuredInfo: 'NDSM wharf is a creative hub with legal walls and stunning large-scale murals.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.8800, 52.3900],
          [4.9200, 52.3900],
          [4.9200, 52.4100],
          [4.8800, 52.4100],
          [4.8800, 52.3900]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'South',
        description: 'Zuid features upscale street art and the MOCO Museum with works by Banksy.',
        artworkCount: 20,
        galleryCount: 2,
        legalWallCount: 1,
        artistCount: 12,
        featuredInfo: 'Visit MOCO Museum for contemporary street art exhibitions.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.8700, 52.3400],
          [4.9000, 52.3400],
          [4.9000, 52.3600],
          [4.8700, 52.3600],
          [4.8700, 52.3400]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'East',
        description: 'Oost is a multicultural district with diverse street art reflecting its communities.',
        artworkCount: 30,
        galleryCount: 2,
        legalWallCount: 3,
        artistCount: 18,
        featuredInfo: 'Javastraat and Dappermarkt area showcase international street art styles.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.9200, 52.3600],
          [4.9600, 52.3600],
          [4.9600, 52.3750],
          [4.9200, 52.3750],
          [4.9200, 52.3600]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'West',
        description: 'West Amsterdam combines industrial heritage with contemporary urban art.',
        artworkCount: 22,
        galleryCount: 3,
        legalWallCount: 2,
        artistCount: 14,
        featuredInfo: 'The Westerpark area hosts regular street art festivals and events.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.8400, 52.3700],
          [4.8700, 52.3700],
          [4.8700, 52.3850],
          [4.8400, 52.3850],
          [4.8400, 52.3700]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'South-East',
        description: 'Zuidoost showcases vibrant murals celebrating cultural diversity.',
        artworkCount: 18,
        galleryCount: 1,
        legalWallCount: 2,
        artistCount: 10,
        featuredInfo: 'Bijlmer area features powerful community-driven street art projects.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.9300, 52.3200],
          [4.9700, 52.3200],
          [4.9700, 52.3400],
          [4.9300, 52.3400],
          [4.9300, 52.3200]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Nieuw-West',
        description: 'Nieuw-West is an emerging street art destination with fresh perspectives and innovative works.',
        artworkCount: 15,
        galleryCount: 1,
        legalWallCount: 3,
        artistCount: 8,
        featuredInfo: 'Sloterplas area features new generation street artists and experimental works.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [4.8000, 52.3600],
          [4.8300, 52.3600],
          [4.8300, 52.3800],
          [4.8000, 52.3800],
          [4.8000, 52.3600]
        ]]
      }
    }
  ]
};