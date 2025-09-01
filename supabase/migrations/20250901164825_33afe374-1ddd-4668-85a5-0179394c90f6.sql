-- Add short_token column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN short_token TEXT;

-- Add unique constraint for short_token
ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_short_token_unique UNIQUE (short_token);

-- Add check constraint for short_token format (6 alphanumeric characters)
ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_short_token_format 
CHECK (short_token IS NULL OR (short_token ~ '^[A-Z0-9]{6}$'));