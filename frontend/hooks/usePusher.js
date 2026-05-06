import { useEffect, useRef, useState, useCallback } from 'react';
import Pusher from 'pusher-js';

export function usePusher({ user, onBlockClaimed, onLeaderboard, onOnlineCount, onCooldownMs } = {}) {
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

    onOnlineCount?.(1);
    onCooldownMs?.(1500);

    // Polling fallback — refreshes grid every 3s in case Pusher misses events
    const poll = setInterval(async () => {
      try {
        const r = await fetch('/api/grid');
        const { cells } = await r.json();
        cells.forEach(cell => {
          if (cell.owner) onBlockClaimed?.(cell);
        });
        const lb = await fetch('/api/leaderboard').then(r => r.json());
        onLeaderboard?.(lb);
      } catch {}
    }, 3000);

    return () => {
      clearInterval(poll);
      channel.unbind_all();
      pusher.unsubscribe('pixelboard');
      pusher.disconnect();
    };
  }, []);

  const claimBlock = useCallback(async (cellId) => {
    if (!user) return;
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellId, user }),
      });
      const data = await res.json();
      // Immediately update UI without waiting for Pusher or poll
      if (data.ok && data.cell) {
        onBlockClaimed?.(data.cell);
      }
    } catch (err) {
      console.error('claim failed:', err);
    }
  }, [user, onBlockClaimed]);

  return { connected, claimBlock };
}