-- writing-coach per-user 데이터 단일 key-value 테이블 (localStorage 미러).
-- user_id = /me sub (안정 user id). payload = 6종 데이터(JSON) 불투명 저장.
CREATE TABLE IF NOT EXISTS writing_user_data (
  user_id    text        NOT NULL,   -- = /me sub
  data_key   text        NOT NULL,   -- 'profile'|'results'|'revisions'|'drafts'|'meta_usage'|'consent'
  payload    jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, data_key)
);
CREATE INDEX IF NOT EXISTS idx_writing_user_data_user ON writing_user_data (user_id);
