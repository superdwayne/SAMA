# Production Deployment Guide

This guide explains how to deploy the Amsterdam Street Art Map to production with the correct API URLs.

## 🚀 Environment Variables Setup

### **For Production Deployment**

When deploying to [https://www.streetartmapamsterdam.nl](https://www.streetartmapamsterdam.nl), you need to set the following environment variable:

```bash
VITE_API_URL=https://www.streetartmapamsterdam.nl/api
```

### **For Vercel Deployment**

If you're using Vercel, add this environment variable in your Vercel dashboard:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://www.streetartmapamsterdam.nl/api`
   - **Environment**: Production (and Preview if needed)

### **For Other Hosting Platforms**

Set the environment variable according to your hosting platform's requirements:

- **Netlify**: Add to Environment Variables in site settings
- **Railway**: Add to Environment Variables in project settings
- **Heroku**: Use `heroku config:set VITE_API_URL=https://www.streetartmapamsterdam.nl/api`

## 🔧 API URL Configuration

### **Current Setup**

The application now uses environment variables for all API calls:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
```

### **Files Updated**

The following files have been updated to use the environment variable:

- ✅ `src/utils/api.js` - Main API utility
- ✅ `src/utils/mapboxData.js` - Mapbox data fetching
- ✅ `src/components/QuickTest.jsx` - Testing interface
- ✅ `src/pages/RegionDetailPage.jsx` - Price fetching
- ✅ `src/components/Payment.jsx` - Payment price fetching
- ✅ `src/components/EmailTest.jsx` - Email testing
- ✅ `src/components/TokenTest.jsx` - Token testing

### **Development vs Production**

| Environment | API_URL | Usage |
|-------------|---------|-------|
| **Development** | `http://localhost:3001/api` | Local development |
| **Production** | `https://www.streetartmapamsterdam.nl/api` | Live website |

## 🌐 Vite Configuration

The `vite.config.js` is already configured to handle the proxy correctly:

```javascript
export default defineConfig(({ mode }) => ({
  server: {
    port: 3000,
    // Only use proxy in development mode
    ...(mode === 'development' && {
      proxy: {
        '/api': 'http://localhost:3001',
      },
    }),
  },
}))
```

This means:
- **Development**: Uses proxy to localhost:3001
- **Production**: Uses the VITE_API_URL environment variable

## 🔍 Testing the Setup

### **1. Development Testing**
```bash
# Start development server
npm run dev

# API calls will go to: http://localhost:3001/api
```

### **2. Production Testing**
```bash
# Build for production
npm run build

# API calls will go to: https://www.streetartmapamsterdam.nl/api
```

### **3. Environment Variable Check**
Add this to your app to verify the API URL:

```javascript
console.log('API URL:', import.meta.env.VITE_API_URL);
```

## 🚨 Important Notes

### **CORS Configuration**
Make sure your backend server (API) is configured to accept requests from:
- `https://www.streetartmapamsterdam.nl`
- `https://www.streetartmapamsterdam.nl/api`

### **SSL/HTTPS**
All production API calls should use HTTPS to avoid mixed content warnings.

### **Backend Deployment**
Ensure your backend API is deployed and accessible at:
`https://www.streetartmapamsterdam.nl/api`

## 🔄 Deployment Checklist

Before deploying to production:

- [ ] Set `VITE_API_URL=https://www.streetartmapamsterdam.nl/api` environment variable
- [ ] Ensure backend API is deployed and accessible
- [ ] Test API endpoints from production domain
- [ ] Verify CORS settings on backend
- [ ] Check SSL/HTTPS configuration
- [ ] Test payment flows in production
- [ ] Verify email functionality in production

## 🐛 Troubleshooting

### **API Calls Failing**
1. Check environment variable is set correctly
2. Verify backend API is running and accessible
3. Check CORS configuration
4. Test API endpoint directly in browser

### **Mixed Content Warnings**
- Ensure all API calls use HTTPS in production
- Check for any hardcoded HTTP URLs

### **Environment Variable Not Working**
- Verify variable name is exactly `VITE_API_URL`
- Check that variable is set for the correct environment (Production)
- Rebuild and redeploy after setting environment variable

## 📞 Support

If you encounter issues with the deployment:

1. Check the browser console for API errors
2. Verify environment variables are set correctly
3. Test API endpoints directly
4. Check backend server logs

The application is now ready for production deployment with proper API URL configuration! 🎉 