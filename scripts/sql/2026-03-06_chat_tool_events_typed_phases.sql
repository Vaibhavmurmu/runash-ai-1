-- Align chat_tool_events with typed stream event contracts and RunAsh session messages.

ALTER TABLE IF EXISTS chat_tool_events
  DROP CONSTRAINT IF EXISTS chat_tool_events_phase_check;

ALTER TABLE IF EXISTS chat_tool_events
  ADD CONSTRAINT chat_tool_events_phase_check
  CHECK (phase IN ('tool_start', 'tool_result', 'tool_error'));

ALTER TABLE IF EXISTS chat_tool_events
  DROP CONSTRAINT IF EXISTS chat_tool_events_message_id_fkey;

ALTER TABLE IF EXISTS chat_tool_events
  ADD CONSTRAINT chat_tool_events_message_id_fkey
  FOREIGN KEY (message_id) REFERENCES runash_chat_session_messages(id) ON DELETE CASCADE;
