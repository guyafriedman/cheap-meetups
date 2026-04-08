-- Add email to travelers
ALTER TABLE travelers ADD COLUMN IF NOT EXISTS email text DEFAULT '';

-- Add booking URLs
ALTER TABLE search_results ADD COLUMN IF NOT EXISTS hotel_booking_url text;
ALTER TABLE flight_quotes ADD COLUMN IF NOT EXISTS booking_url text;
