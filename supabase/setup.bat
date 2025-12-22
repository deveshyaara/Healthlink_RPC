@echo off

REM ===========================================
REM HealthLink Database Setup Script (Windows)
REM Run this script to set up the complete database
REM ===========================================

echo 🚀 Setting up HealthLink Database...

REM Check if Supabase CLI is installed
supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Supabase CLI is not installed. Please install it first:
    echo npm install -g supabase
    exit /b 1
)

REM Check if we're in a Supabase project
if not exist "config.toml" (
    echo ❌ Not in a Supabase project directory. Please run this from the supabase folder.
    exit /b 1
)

echo 📦 Applying database migrations...

REM Apply migrations
supabase db push

if %errorlevel% equ 0 (
    echo ✅ Database migrations applied successfully!
) else (
    echo ❌ Failed to apply migrations. Please check the errors above.
    exit /b 1
)

echo 🔐 Setting up Row Level Security policies...

REM The RLS policies are included in the migrations, so they should be applied above

echo 🎯 Generating TypeScript types...

REM Generate types
supabase gen types typescript --local > ..\types\supabase.ts

if %errorlevel% equ 0 (
    echo ✅ TypeScript types generated successfully!
) else (
    echo ⚠️  TypeScript types generation failed, but this is not critical.
)

echo.
echo 🎉 Database setup complete!
echo.
echo 📋 Next steps:
echo 1. Set up your environment variables in .env.local
echo 2. Run the application: npm run dev
echo 3. Test patient creation through the API.
echo.
echo 🔗 Useful commands:
echo - supabase db reset    # Reset database and reapply migrations
echo - supabase db push     # Apply new migrations
echo - supabase status      # Check Supabase local status
echo.
pause