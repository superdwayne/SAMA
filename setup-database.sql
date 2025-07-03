-- Database schema for Amsterdam Street Art Map
-- Run these commands in your Supabase SQL editor

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_session_id TEXT NOT NULL UNIQUE,
    customer_email TEXT NOT NULL,
    region TEXT NOT NULL,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'eur',
    payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
    stripe_payment_intent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create magic_links table
CREATE TABLE IF NOT EXISTS magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchases_email ON purchases(customer_email);
CREATE INDEX IF NOT EXISTS idx_purchases_region ON purchases(region);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;

-- Create policies for purchases table
CREATE POLICY "Anyone can read purchases" ON purchases
    FOR SELECT USING (true);

CREATE POLICY "Service role can insert purchases" ON purchases
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update purchases" ON purchases
    FOR UPDATE TO service_role
    USING (true);

-- Create policies for magic_links table
CREATE POLICY "Anyone can read magic links" ON magic_links
    FOR SELECT USING (true);

CREATE POLICY "Service role can insert magic links" ON magic_links
    FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update magic links" ON magic_links
    FOR UPDATE TO service_role
    USING (true);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_purchases_updated_at 
    BEFORE UPDATE ON purchases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to clean up expired magic links
CREATE OR REPLACE FUNCTION cleanup_expired_magic_links()
RETURNS void AS $$
BEGIN
    DELETE FROM magic_links 
    WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ language 'plpgsql';

-- Optional: Create a scheduled job to clean up expired links daily
-- This requires the pg_cron extension (available in Supabase Pro)
-- SELECT cron.schedule('cleanup-expired-magic-links', '0 2 * * *', 'SELECT cleanup_expired_magic_links();');
