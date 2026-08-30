import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../utils/api';

export type ChatMessage = {
  id: number;
  role: 'user' | 'agent' | 'system';
  agent?: string;
  text: string;
  time: number;
  error?: boolean;
};

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const idRef = useRef(0);
  const msgRef = useRef<ChatMessage[]>([]);
  msgRef.current = messages;

  useEffect(() => {
    const socket = io(BASE_URL || undefined, { transports: ['websocket'], reconnection: true });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('chat:typing', (d: { typing: boolean; agent?: string }) => {
      setTyping(d.typing ? (d.agent || '代理人') : null);
    });

    socket.on('chat:response', (d: { ok: boolean; reply?: string; error?: string; agent?: string }) => {
      const id = ++idRef.current;
      setMessages(prev => [
        ...prev,
        { id, role: 'agent', agent: d.agent || '代理人', text: d.ok ? (d.reply || '') : ('（錯誤）' + (d.error || '')), time: Date.now(), error: !d.ok },
      ]);
      setTyping(null);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const send = useCallback((text: string, opts?: { agent?: string; focusTeam?: string; matchId?: number }) => {
    const trimmed = (text || '').trim();
    if (!trimmed || !socketRef.current) return;
    const id = ++idRef.current;
    setMessages(prev => [...prev, { id, role: 'user', text: trimmed, time: Date.now() }]);
    socketRef.current.emit('chat:message', {
      message: trimmed,
      agent: opts?.agent,
      focusTeam: opts?.focusTeam,
      matchId: opts?.matchId,
    });
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, typing, connected, send, clear };
}
