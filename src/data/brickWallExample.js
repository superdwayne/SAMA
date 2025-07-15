// Example of how to use the brick wall icon in your pin data
// You can add this to your existing locations data or use it as a template

export const brickWallExamplePins = [
  {
    id: "brick-wall-example-1",
    title: "Legal Graffiti Wall",
    artist: "Various Artists",
    description: "A designated legal wall for street art and graffiti. Artists can paint here without permission.",
    type: "brick-wall", // This will trigger the BrickWallIcon
    district: "Nieuw-West",
    latitude: 52.377354,
    longitude: 4.823076,
    image_url: "",
    address: "Example Street 123",
    openingHours: "24/7",
    year: "2024",
    source: "example"
  },
  {
    id: "brick-wall-example-2", 
    title: "Street Art Wall",
    artist: "Local Artists",
    description: "A popular wall for street art and murals in the neighborhood.",
    type: "wall", // This will also trigger the BrickWallIcon
    district: "New-West",
    latitude: 52.378331,
    longitude: 4.831967,
    image_url: "",
    address: "Art Street 456",
    openingHours: "Always open",
    year: "2024",
    source: "example"
  },
  {
    id: "brick-wall-example-3",
    title: "Legal Wall Zone",
    artist: "Community",
    description: "A community-managed legal wall for street art expression.",
    type: "legal-wall", // This will also trigger the BrickWallIcon
    district: "Nieuw-West", 
    latitude: 52.376707,
    longitude: 4.806099,
    image_url: "",
    address: "Community Wall 789",
    openingHours: "Daylight hours",
    year: "2024",
    source: "example"
  }
];

// How to integrate this with your existing data:
// 
// 1. Import this data in your Map.jsx:
//    import { brickWallExamplePins } from '../data/brickWallExample';
//
// 2. Add it to your combined locations:
//    const combinedLocations = [...streetArtLocations, ...mapboxData, ...brickWallExamplePins];
//
// 3. Or add it to your Mapbox dataset with type: "brick-wall", "wall", or "legal-wall"
//
// The BrickWallIcon will automatically appear for pins with these types! 