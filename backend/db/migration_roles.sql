-- Migration: Convert single 'role' column to 'roles' TEXT[] array
-- Run this on an existing database INSTEAD of schema.sql

-- Step 1: Add new roles column
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['student'];

-- Step 2: Migrate existing role values to array
UPDATE users SET roles = ARRAY[role] WHERE roles IS NULL OR roles = '{}';

-- Step 3: Drop the old role column and its constraint
-- (Do this only after verifying the migration above worked correctly)
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Step 4: Drop old index and add GIN index on roles array
DROP INDEX IF EXISTS idx_users_role;
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);

-- Verify migration
SELECT id, name, email, roles FROM users LIMIT 10;