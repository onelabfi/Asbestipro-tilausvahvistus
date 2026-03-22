-- Add report_sent_at timestamp to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS report_sent_at timestamptz NULL;
