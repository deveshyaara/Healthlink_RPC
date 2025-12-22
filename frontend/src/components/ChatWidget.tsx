'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { chatApi, healthApi } from '@/lib/api-client';

const _API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
// const CHAT_ENDPOINT = API_BASE ? `${API_BASE}/api/chat` : '/api/chat';

type Message = { id: string; role: 'user' | 'bot'; text: string };

export function ChatWidget(): JSX.Element | null {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Check backend connection on mount
  useEffect(() => {
    const checkBackendConnection = async () => {
      if (!isAuthenticated) {
        return;
      }

      try {
        await healthApi.check();
        setBackendConnected(true);
      } catch (error) {
        console.error('Backend connection check failed:', error);
        setBackendConnected(false);
      } finally {
        setConnectionChecked(true);
      }
    };

    checkBackendConnection();
  }, [isAuthenticated]);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: 99999 });
    }
  }, [open, messages]);

  // Don't render if not authenticated or backend not connected
  if (!isAuthenticated || !connectionChecked || !backendConnected) {
    return null;
  }

  async function sendMessage() {
    if (!input.trim()) {
      return;
    }
    const userMsg: Message = { id: String(Date.now()), role: 'user', text: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatApi.sendMessage(userMsg.text);
      const botText = response?.data?.response || response?.reply || response?.message || 'Sorry, I could not process your message.';
      const botMsg: Message = { id: String(Date.now() + 1), role: 'bot', text: botText };
      setMessages((m) => [...m, botMsg]);
    } catch (error: any) {
      const errMsg: Message = { id: String(Date.now() + 2), role: 'bot', text: error?.message || 'Error: could not reach chat backend.' };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div>
      {/* Floating Button */}
      <button
        aria-label="Open chat"
        onClick={() => setOpen((s) => !s)}
        className="fixed bottom-4 right-4 z-50 bg-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700"
      >
        💬
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-72 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-4 py-2 border-b">
            <div className="text-xs text-yellow-800 font-semibold">⚠️ AI Advice Only. Consult a Doctor.</div>
          </div>

          <div ref={listRef} className="h-64 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.length === 0 && <div className="text-sm text-gray-500">Say hi — ask about symptoms, medications, or appointments.</div>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 border'} max-w-[80%] px-3 py-2 rounded-lg`}>{m.text}</div>
              </div>
            ))}
            {loading && <div className="text-sm text-gray-500">Typing...</div>}
          </div>

          <div className="p-2 border-t bg-white">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask the health assistant..."
                className="flex-1 rounded-md border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="px-3 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-60"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              This AI provides general health information. For medical emergencies, contact your healthcare provider.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWidget;
