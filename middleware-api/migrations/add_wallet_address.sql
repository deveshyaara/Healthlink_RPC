-- Migration: Add wallet_address to users table
-- Description: Adds wallet_address field to support Ethereum blockchain integration

-- Add wallet_address column to users table
ALTER TABLE "users" 
ADD COLUMN "wallet_address" VARCHAR(42);

-- Add unique constraint on wallet_address
ALTER TABLE "users" 
ADD CONSTRAINT "users_wallet_address_key" UNIQUE ("wallet_address");

-- Create index for faster lookups
CREATE INDEX "idx_users_wallet_address" ON "users"("wallet_address");

-- Optional: Update existing doctor with a sample wallet address (for testing)
-- UPDATE "users" 
-- SET "wallet_address" = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbC'
-- WHERE "email" = 'deveshdoctor@example.com' AND "role" = 'doctor';

-- Verify the changes
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'wallet_address';
