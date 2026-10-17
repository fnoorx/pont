-- A reporter's language is unknown until they choose it at the first message.
-- With a default of 'fr', a brand-new reporter looked like they had already chosen French,
-- so the bot could not tell when to greet in both languages. French remains the fallback
-- in the bot's string lookup, not in the data.
alter table public.reporters alter column language drop default;
alter table public.reporters alter column language drop not null;
