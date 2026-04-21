ALTER TABLE crop DROP CONSTRAINT IF EXISTS is_path;

ALTER TABLE crop ADD CONSTRAINT is_url CHECK (url :: VARCHAR(2048) ~* 'https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,255}\.[a-z]{2,9}\y([-a-zA-Z0-9@:%_\+.~#?&//=]*)$');