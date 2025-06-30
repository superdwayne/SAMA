# Amsterdam Street Art Map

A React-based interactive map application for exploring street art throughout Amsterdam. This project is part of the "Urbanites United: Amsterdam as a Living Canvas" initiative.

## Features

- 🗺️ Interactive map of Amsterdam's 7 districts
- 📱 **Mobile-optimized interface** with native app-like experience
- 🎨 Curated street art locations including:
  - Ephemeral works
  - Street art galleries
  - Legal graffiti walls
  - Museums (SAMA, MOCO, STRAAT)
  - Artist studios and broedplaatsen
- 💳 Stripe payment integration for full access
- 📱 Responsive design with automatic mobile detection
- 🔒 Secure authentication system
- 🎯 3D building visualization
- 📍 Detailed artwork information with popups

## Tech Stack

- **Frontend**: React 18 with Vite
- **Map**: Mapbox GL JS with react-map-gl
- **Routing**: React Router v6
- **Payment**: Stripe
- **Styling**: CSS3 with modern features
- **State Management**: React hooks

## Setup Instructions

1. **Clone the repository**
   ```bash
   cd ~/Desktop/amsterdam-street-art-map
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Add your API keys:
     - Mapbox token (get from https://www.mapbox.com/)
     - Stripe public key (get from https://stripe.com/)

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/
│   ├── Map.jsx              # Main map component
│   ├── MobileLanding.jsx    # Mobile interface (NEW)
│   ├── Landing.jsx          # Desktop landing page
│   ├── Payment.jsx          # Stripe payment integration
│   ├── WelcomeTooltip.jsx
│   ├── RegionInfo.jsx
│   └── ArtworkPopup.jsx
├── data/
│   ├── regions.js           # Amsterdam districts GeoJSON
│   └── locations.js         # Street art locations
├── utils/
│   ├── auth.js             # Authentication utilities
│   └── mobile.js           # Mobile detection utilities (NEW)
├── App.jsx                 # Main app with mobile redirect
└── main.jsx               # Entry point
```

## Mobile Interface

The app now includes a dedicated mobile interface that provides:

### 📱 Native App Experience
- iPhone-like status bar and navigation
- Touch-optimized interactions
- Smooth animations and transitions
- Card-based region selection

### 🔄 Smart Device Detection
- Automatic redirect to mobile interface on mobile devices
- Manual switching between mobile/desktop versions
- Maintains user preference with URL parameters

### 🗺️ Mobile Features
- Region preview with animated map backgrounds
- Artwork counts for each district
- Direct integration with payment system
- Seamless handoff to desktop map for exploration

### 📍 Access Mobile Interface
- **Automatic**: Mobile devices are redirected to `/mobile`
- **Manual**: Visit `/mobile` directly
- **Switch**: Use "Desktop version" button to switch

## Key Features Implementation

### Map Functionality
- Districts are color-coded (green = unlocked, red = locked)
- 3D buildings render at zoom level 15+
- Markers show different icons based on location type
- Click interactions for both regions and markers

### Payment Flow
1. User clicks "Purchase Map Access"
2. Enters email and payment details
3. Stripe processes payment (demo mode)
4. Access token saved to localStorage
5. User redirected to full map

### Security
- Access tokens expire after 24 hours (demo)
- Routes protected with authentication checks
- Secure payment processing with Stripe

## Next Steps for Production

1. **Backend Implementation**
   - Set up Node.js/Express server
   - Implement Firebase authentication
   - Create Stripe payment endpoints
   - Set up database for user management

2. **Additional Features**
   - User accounts and profiles
   - Favorite locations
   - Photo uploads
   - Audio guides integration
   - Offline map capability
   - Multi-language support

3. **Content Management**
   - Admin panel for updating locations
   - Artist profiles
   - Event calendar
   - News/updates section

4. **Performance Optimization**
   - Lazy loading for images
   - Map tile caching
   - Code splitting
   - PWA features

## License

This project is part of SAMA (Street Art Museum Amsterdam) initiative.

## Contact

For questions or collaboration: info@streetartmuseumamsterdam.com