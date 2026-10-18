-- Pont: remember the replies sent for each message id. When a phone retries a message whose
-- response was lost on a bad connection, the webhook sends the same replies again instead of
-- nothing, so the reporter still gets the next question and its answer buttons.
alter table public.processed_messages add column replies jsonb;
