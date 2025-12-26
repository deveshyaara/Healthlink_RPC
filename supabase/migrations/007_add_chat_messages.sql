-- Migration: Add chat_messages table for LangGraph agent
-- Purpose: Store conversation history between users and AI agent

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    thread_id VARCHAR(255) NOT NULL,
    metadata TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Comment the table
COMMENT ON TABLE chat_messages IS 'Stores conversation history between users and LangGraph AI agent';
COMMENT ON COLUMN chat_messages.role IS 'Message role: user or assistant';
COMMENT ON COLUMN chat_messages.thread_id IS 'Conversation thread identifier for maintaining context';
COMMENT ON COLUMN chat_messages.metadata IS 'Additional metadata stored as JSON string';
