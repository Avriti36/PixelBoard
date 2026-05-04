import { useEffect, useRef, useState, useCallback } from 'react';
import Pusher from 'pusher-js';

export function usePusher({ user, onBlockClaimed, onLeaderboard, onOnlineCount, onCooldownMs }) {
  const [connected, setConnected] = useState(false);
  const pusherRef = useRef(null);

  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });
    pusherRef.current = pusher;

    pusher.connection.bind('connected', () => setConnected(true));
    pusher.connection.bind('disconnected', () => setConnected(false));
    pusher.connection.bind('error', () => setConnected(false));

    const channel = pusher.subscribe('pixelboard');
    channel.bind('block_claimed', (data) => onBlockClaimed?.(data));
    channel.bind('leaderboard_update', (data) => onLeaderboard?.(data));

    // Simulate online count via presence (simple version)
    onOnlineCount?.(1);
    onCooldownMs?.(1500);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe('pixelboard');
      pusher.disconnect();
    };
  }, []);

  const claimBlock = useCallback(async (cellId) => {
    if (!user) return;
    try {
      await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellId, user }),
      });
    } catch (err) {
      console.error('claim failed:', err);
    }
  }, [user]);

  return { connected, claimBlock };
}