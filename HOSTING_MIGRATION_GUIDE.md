# Hosting Migration Guide: Vercel to Hostnet

## Overview
This guide explains how to move the Amsterdam Street Art Map project hosting to Hostnet while keeping API calls in Vercel.

**Goal**: Host static site on Hostnet, keep API endpoints on Vercel, no code changes needed.

## Step 1: Build Your Project for Static Hosting
1. **In your project directory**, run:
   ```bash
   npm run build
   ```
   This creates an optimized production build in the `dist` or `build` folder.

## Step 2: Upload to Hostnet
1. **Login to your Hostnet account**
2. **Go to your hosting control panel** (usually called "Mijn Hostnet" or similar)
3. **Find the file manager** or FTP access for your domain
4. **Upload all files** from your `dist`/`build` folder to the public HTML directory (usually `public_html` or `htdocs`)

## Step 3: Update Domain DNS (Important!)
1. **In Hostnet**, go to DNS management for `streetartmapamsterdam.nl`
2. **Change the A record** to point to Hostnet's server IP (Hostnet will provide this)
3. **Keep all your email DNS records** (MX, TXT SPF, TXT DKIM) - don't touch these!

## Step 4: Configure Hostnet for SPA (if needed)
If your app is a Single Page Application (React/Vue/etc):
1. **Add a `.htaccess` file** to handle client-side routing:
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   ```

## Step 5: Test
1. **Wait for DNS propagation** (up to 24 hours)
2. **Visit your domain** to confirm it loads from Hostnet
3. **Test your API calls** - they should still work with Vercel since you're not changing any code

## Important Notes
- Your API endpoints will remain on Vercel
- Your static site will be served from Hostnet
- No code changes needed
- Email DNS records stay the same (already configured for Resend)

## Current Email Setup
- Using `noreply@streetartmapamsterdam.nl` with Resend
- DNS records configured on both Hostnet and Vercel
- Email functionality will continue to work after migration

## Domain: streetartmapamsterdam.nl
- **Static hosting**: Moving to Hostnet
- **API endpoints**: Staying on Vercel
- **Email service**: Resend (already configured)
