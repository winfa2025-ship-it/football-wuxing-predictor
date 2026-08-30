import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../utils/api';
import { Fixture } from '../utils/types';

export function useLiveScores(): Fixture[] {
  const [scores, setScores] = useState<Fixture[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(BASE_URL || undefined, { transports: ['websocket'], reconnection: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe', []);
    });

    socket.on('live:scores', (data: Fixture[]) => {
      setScores(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return scores;
}

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<(() => void) | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
