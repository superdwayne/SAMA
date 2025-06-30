# Mapbox Token Management

This feature allows users to add their own custom Mapbox access tokens for better usage tracking and potentially higher rate limits.

## How it works

1. **Default token**: The app uses a hardcoded Mapbox token from the environment variables as the default
2. **Custom tokens**: Users can add their own Mapbox tokens through the "Map Settings" button in the header
3. **Token validation**: All tokens are validated against the Mapbox API before being saved
4. **Token storage**: Custom tokens are stored in localStorage with expiration dates
5. **Fallback**: If a custom token expires or fails, the app falls back to the default token

## Features

- ✅ Token validation using Mapbox Geocoding API
- ✅ Token expiration tracking
- ✅ Secure token storage in localStorage
- ✅ Easy token management UI
- ✅ Automatic fallback to default token
- ✅ Token masking for security in the UI

## Usage

### For users:
1. Click the "🗺️ Map Settings" button in the top-right corner
2. Click "Add Custom Token"
3. Enter your Mapbox access token
4. Click "Validate & Save"
5. The token will be validated and saved if it's valid

### For developers:
```javascript
import { mapboxTokenManager } from '../utils/mapboxAuth';

// Get the currently active token
const token = mapboxTokenManager.getActiveToken();

// Validate a token
const result = await mapboxTokenManager.validateToken('your-token-here');

// Save a custom token
mapboxTokenManager.saveCustomToken('your-token-here', 30); // expires in 30 days
```

## Token Management API

The `MapboxTokenManager` class provides:

- `getActiveToken()` - Returns the currently active token (custom or default)
- `getCustomToken()` - Returns only the custom token if available
- `saveCustomToken(token, expiresInDays)` - Saves a custom token
- `validateToken(token)` - Validates a token against Mapbox API
- `removeCustomToken()` - Removes the custom token
- `getTokenInfo()` - Returns token information for display
- `isUsingCustomToken()` - Checks if a custom token is active
- `resetToDefault()` - Resets to the default token

## File Structure

```
src/
├── utils/
│   └── mapboxAuth.js          # Token management utilities
├── components/
│   ├── MapboxTokenSettings.jsx # Token settings modal
│   ├── MapboxTokenSettings.css # Styles for the modal
│   └── Map.jsx                # Updated to use token manager
```

## Security Considerations

- Tokens are stored in localStorage (client-side only)
- Tokens are masked in the UI for security
- Validation prevents invalid tokens from being saved
- Automatic cleanup of expired tokens

## Benefits

- **Better usage tracking**: Users can monitor their own Mapbox usage
- **Higher rate limits**: Personal tokens may have higher limits than shared tokens
- **Cost control**: Users can set up billing alerts on their own accounts
- **Domain restrictions**: Users can restrict tokens to specific domains for security

## Creating a Mapbox Token

To create your own Mapbox access token:

1. Go to [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)
2. Sign in to your Mapbox account (or create one)
3. Click "Create a token"
4. Give it a name (e.g., "Amsterdam Street Art Map")
5. Select the scopes you need (default public scopes are usually sufficient)
6. Optionally restrict it to your domain for security
7. Click "Create token"
8. Copy the token and paste it into the app

## Troubleshooting

**Token validation fails:**
- Make sure the token is copied correctly
- Check that the token has the required scopes
- Verify the token hasn't expired in your Mapbox account

**Map doesn't load:**
- The app will automatically fall back to the default token
- Check the browser console for error messages
- Try removing the custom token and using the default

**Token disappeared:**
- Custom tokens expire after 30 days by default
- Check if you cleared browser localStorage
- Simply re-add your token if needed

## Testing

The token management system includes:
- Token validation against live Mapbox API
- Fallback mechanisms
- Error handling for network issues
- Caching to reduce API calls

For testing purposes, the current hardcoded token remains as the fallback, ensuring the app always works even without custom tokens.
