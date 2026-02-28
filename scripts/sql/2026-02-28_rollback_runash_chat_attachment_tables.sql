-- Rollback for chat attachment metadata tables.
-- WARNING: destructive migration. Ensure metadata/object backups exist before execution.
-- Execute only after disabling new chat attachment writes.

DROP INDEX IF EXISTS idx_runash_chat_attachments_user_status;
DROP INDEX IF EXISTS idx_runash_chat_attachments_message;
DROP INDEX IF EXISTS idx_runash_chat_attachments_session_created;
DROP INDEX IF EXISTS idx_runash_chat_attachments_object_unique;
DROP TABLE IF EXISTS runash_chat_attachments;
