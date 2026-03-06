-- Rollback for normalized chat persistence tables.
-- WARNING: destructive rollback. Ensure data backups before execution.

DROP INDEX IF EXISTS idx_chat_tool_events_message_created;
DROP INDEX IF EXISTS idx_chat_attachments_message_id;
DROP INDEX IF EXISTS idx_chat_messages_session_created;
DROP INDEX IF EXISTS idx_chat_sessions_user_updated;

DROP TABLE IF EXISTS chat_tool_events;
DROP TABLE IF EXISTS chat_attachments;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_sessions;
