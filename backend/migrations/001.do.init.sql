// 001.do.create-users-table.sql
// Dit dient als een voorbeeld
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY NOT NULL,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL
);
