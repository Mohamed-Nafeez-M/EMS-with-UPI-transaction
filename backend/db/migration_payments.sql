-- Migration: Add payments table
-- Created for UTR-based payment tracking

CREATE TABLE IF NOT EXISTS payments (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  event_id   INTEGER NOT NULL,
  utr        VARCHAR(20) NOT NULL,
  status     VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
