CREATE TABLE user_sessions (
  user_id BIGINT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'idle',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON user_sessions FOR ALL USING (true) WITH CHECK (true);