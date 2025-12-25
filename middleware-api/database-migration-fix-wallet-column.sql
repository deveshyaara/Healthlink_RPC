-- ============================================================================
-- Quick Fix: Rename walletAddress to wallet_address in patient_wallet_mappings
-- Run this if you get "column wallet_address does not exist" error
-- ============================================================================

-- Check and fix column name in patient_wallet_mappings table
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'patient_wallet_mappings'
    ) THEN
        -- Check if column exists with wrong name (walletAddress)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'patient_wallet_mappings' 
            AND column_name = 'walletAddress'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'patient_wallet_mappings' 
            AND column_name = 'wallet_address'
        ) THEN
            -- Drop indexes that might reference the old column
            DROP INDEX IF EXISTS "idx_patient_wallet_address";
            
            -- Drop unique constraint if exists
            ALTER TABLE "patient_wallet_mappings" DROP CONSTRAINT IF EXISTS "patient_wallet_mappings_walletAddress_key";
            ALTER TABLE "patient_wallet_mappings" DROP CONSTRAINT IF EXISTS "patient_wallet_mappings_wallet_address_key";
            
            -- Rename column
            ALTER TABLE "patient_wallet_mappings" RENAME COLUMN "walletAddress" TO "wallet_address";
            
            -- Recreate unique constraint
            ALTER TABLE "patient_wallet_mappings" ADD CONSTRAINT "patient_wallet_mappings_wallet_address_key" 
                UNIQUE ("wallet_address");
            
            -- Recreate index
            CREATE INDEX IF NOT EXISTS "idx_patient_wallet_address" ON "patient_wallet_mappings"("wallet_address");
            
            RAISE NOTICE '✅ Successfully renamed walletAddress to wallet_address';
        ELSIF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'patient_wallet_mappings' 
            AND column_name = 'wallet_address'
        ) THEN
            -- Column doesn't exist at all, add it
            ALTER TABLE "patient_wallet_mappings" ADD COLUMN "wallet_address" VARCHAR(42);
            ALTER TABLE "patient_wallet_mappings" ADD CONSTRAINT "patient_wallet_mappings_wallet_address_key" 
                UNIQUE ("wallet_address");
            CREATE INDEX IF NOT EXISTS "idx_patient_wallet_address" ON "patient_wallet_mappings"("wallet_address");
            RAISE NOTICE '✅ Added wallet_address column';
        ELSE
            RAISE NOTICE '✅ Column wallet_address already exists with correct name';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  Table patient_wallet_mappings does not exist yet. Run full migration first.';
    END IF;
END $$;

-- Verify the fix
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patient_wallet_mappings' 
        AND column_name = 'wallet_address'
    ) THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ Fix Applied Successfully!';
        RAISE NOTICE 'Column wallet_address now exists.';
        RAISE NOTICE 'You can now run the full migration.';
        RAISE NOTICE '========================================';
    END IF;
END $$;

