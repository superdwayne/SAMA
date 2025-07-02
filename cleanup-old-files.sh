#!/bin/bash

echo "🧹 Cleaning up old/unused files..."
echo "================================"
echo ""

# List what we're about to remove
echo "Files that will be removed:"
echo "- api-unused/ directory (old implementations)"
echo "- Old test scripts that reference wrong paths"
echo ""

read -p "Continue with cleanup? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing old files..."
    
    # Remove the entire api-unused directory
    if [ -d "api-unused" ]; then
        rm -rf api-unused
        echo "✅ Removed api-unused directory"
    fi
    
    echo "✅ Cleanup completed!"
    echo ""
    echo "Current active files:"
    echo "- api/stripe/webhook.js (main webhook)"
    echo "- api/utils/magic-links.js (utilities)"
    echo "- api/send-magic-link.js (magic link sender)"
    echo "- api/verify-magic-link.js (magic link verifier)"
    echo "- api/activate.js (activation endpoint)"
else
    echo "Cleanup cancelled."
fi
