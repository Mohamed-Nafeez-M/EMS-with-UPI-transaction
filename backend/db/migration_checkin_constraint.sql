-- migration_checkin_constraint.sql
-- Run this in your PostgreSQL database if check-in gives a constraint violation error.
-- This adds 'checked_in' to the registrations.status CHECK constraint.

-- Step 1: Drop the old constraint
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_check;

-- Step 2: Re-add it with 'checked_in' included
ALTER TABLE registrations
  ADD CONSTRAINT registrations_status_check
  CHECK (status IN ('confirmed', 'cancelled', 'waitlisted', 'checked_in'));

-- Verify
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'registrations'::regclass AND contype = 'c';