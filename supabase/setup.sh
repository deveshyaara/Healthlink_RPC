#!/bin/bash

# ===========================================
# HealthLink Database Setup Script
# Run this script to set up the complete database
# ===========================================

echo "🚀 Setting up HealthLink Database..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this from the project root."
    exit 1
fi

echo "📦 Applying database migrations..."

# Apply migrations
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migrations applied successfully!"
else
    echo "❌ Failed to apply migrations. Please check the errors above."
    exit 1
fi

echo "🔐 Setting up Row Level Security policies..."

# The RLS policies are included in the migrations, so they should be applied above

echo "🎯 Generating TypeScript types..."

# Generate types
supabase gen types typescript --local > types/supabase.ts

if [ $? -eq 0 ]; then
    echo "✅ TypeScript types generated successfully!"
else
    echo "⚠️  TypeScript types generation failed, but this is not critical."
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up your environment variables in .env.local"
echo "2. Run the application: npm run dev"
echo "3. Test patient creation through the API route"
echo ""
echo "🔗 Useful commands:"
echo "- supabase db reset    # Reset database and reapply migrations"
echo "- supabase db push     # Apply new migrations"
echo "- supabase status      # Check Supabase local status"