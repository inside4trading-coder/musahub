
-- Delete email logs for campaigns created before March 15
DELETE FROM email_logs WHERE campaign_id IN (
  SELECT id FROM email_campaigns WHERE created_at < '2026-03-15T00:00:00+00:00'
);

-- Delete campaign steps for campaigns created before March 15
DELETE FROM campaign_steps WHERE campaign_id IN (
  SELECT id FROM email_campaigns WHERE created_at < '2026-03-15T00:00:00+00:00'
);

-- Delete the campaigns themselves
DELETE FROM email_campaigns WHERE created_at < '2026-03-15T00:00:00+00:00';
