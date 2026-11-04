'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  escalated?: boolean;
}

export default function SAMWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'bot', text: 'How can we help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [escalated, setEscalated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: Date.now(), sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    try {
      const res = await fetch('/api/sam/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data?.ok && data?.data) {
        const reply: Message = {
          id: Date.now() + 1,
          sender: 'bot',
          text: data.data.reply || 'Received.',
          escalated: data.data.escalated || false,
        };
        setMessages((prev) => [...prev, reply]);
        if (data.data.escalated) setEscalated(true);
      } else {
        setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text: 'Something went wrong. Try again later.' }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text: 'Connection error. Please try again.' }]);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') send();
  }

  return (
    <div className="fixed bottom-36 right-4 z-50 flex flex-col items-end gap-3" aria-label="Support assistant widget">
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: '520px' }}>
          <div className="bg-[#005cb3] text-white px-4 py-3 flex items-center justify-between">
            <strong className="text-sm">Support</strong>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close support widget"
              className="text-white hover:text-blue-100 p-1 rounded"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50" aria-live="polite" aria-atomic="false" role="log">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed shadow-sm ${m.sender === 'user' ? 'bg-[#005cb3] text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'}`}>
                  {m.text}
                  {m.escalated && (
                    <span className="block text-xs text-amber-700 mt-1 font-medium">Escalated to a specialist.</span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {escalated && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-800 font-medium flex items-center gap-2" role="status" aria-live="polite">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              This message has been escalated.
              <button
                onClick={() => setEscalated(false)}
                aria-label="Dismiss escalation notice"
                className="ml-auto text-amber-700 hover:text-amber-900 underline text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              id="sam-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 rounded-full bg-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#005cb3]/40 text-slate-800 placeholder:text-slate-400"
              aria-label="Support message input"
            />
            <button
              onClick={send}
              aria-label="Send message"
              className="bg-[#005cb3] hover:bg-[#004A94] text-white p-2 rounded-full shadow-md transition-colors"
              title="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close support widget' : 'Open support widget'}
        className="w-12 h-12 rounded-full bg-[#005cb3] text-white shadow-xl hover:bg-[#004A94] transition-all flex items-center justify-center relative"
        aria-expanded={open}
      >
        {open ? (
          <svg className="translate-y-[-2px]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ) : (
          <svg className="translate-y-[-2px]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h.01" /><path d="M12 9h.01" /><path d="M16 9h.01" /></svg>
        )}
      </button>
    </div>
  );
}
