-- CarVibeDubai — Migration 0024: Add inspection_scheduled_at timestamp to leads

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS inspection_scheduled_at timestamp with time zone NULL;

COMMENT ON COLUMN leads.inspection_scheduled_at IS 'Date and time when customer inspection/viewing is scheduled at the facility.';
