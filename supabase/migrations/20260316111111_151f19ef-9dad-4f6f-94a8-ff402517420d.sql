
-- Delete all email logs
DELETE FROM email_logs;

-- Reset all campaign statuses to 'Borrador' and clear sent_at
UPDATE email_campaigns SET status = 'Borrador', sent_at = NULL;

-- Reset all campaign steps to 'Pendiente' and clear sent_at
UPDATE campaign_steps SET status = 'Pendiente', sent_at = NULL;
