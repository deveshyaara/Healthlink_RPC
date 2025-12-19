#!/bin/bash

# HealthLink Pro - Production Database Setup Script
# Run this after deploying to ensure Supabase is properly configured

echo "🔧 HealthLink Pro - Production Database Setup"
echo "=============================================="

# Check if environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set"
    echo "   Set these in your Render.com environment variables"
    exit 1
fi

echo "✅ Environment variables configured"

# Test Supabase connection
echo "🔍 Testing Supabase connection..."
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('$SUPABASE_URL', '$SUPABASE_SERVICE_KEY');
(async () => {
  try {
    const { error } = await supabase.from('healthlink_users').select('count', { count: 'exact', head: true });
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      process.exit(1);
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message);
    process.exit(1);
  }
})();
"

if [ $? -ne 0 ]; then
    echo ""
    echo "🚨 SUPABASE SETUP REQUIRED:"
    echo "1. Go to your Supabase project dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Run the following SQL:"
    echo ""
    cat supabase-schema.sql
    echo ""
    echo "4. Verify the table was created successfully"
    echo "5. Redeploy your application"
    exit 1
fi

echo ""
echo "🎉 Database setup complete!"
echo "   Your HealthLink Pro deployment should now work correctly."