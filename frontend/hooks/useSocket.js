import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export function useSocket({ user, onBlockClaimed, onLeaderboard, onOnlineCount, onOnlineUsers, onCooldownMs }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const socket = io(WS_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', user);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('joined', ({ onlineCount, cooldownMs }) => {
      onOnlineCount?.(onlineCount);
      onCooldownMs?.(cooldownMs);
    });

    socket.on('block_claimed', (payload) => onBlockClaimed?.(payload));
    socket.on('leaderboard_update', (data) => onLeaderboard?.(data));
    socket.on('online_count', (n) => onOnlineCount?.(n));
    socket.on('online_users', (users) => onOnlineUsers?.(users));

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const claimBlock = useCallback((cellId) => {
    socketRef.current?.emit('claim_block', { cellId, user });
  }, [user]);

  return { connected, claimBlock };
}
