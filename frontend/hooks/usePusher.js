import { useEffect, useRef, useState, useCallback } from 'react';
import Pusher from 'pusher-js';

Pusher.logToConsole = true;

const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY?.trim();
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER?.trim();

export function usePusher({
  user,
  onBlockClaimed,
  onLeaderboard,
  onOnlineCount,
  onCooldownMs,
} = {}) {

  const [connected, setConnected] = useState(false);
  const pusherRef = useRef(null);

  useEffect(() => {
    if (!pusherKey || !pusherCluster) {
      console.warn('Pusher is disabled: NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER are required.');
      setConnected(false);
      return undefined;
    }

    const pusher = new Pusher(
      pusherKey,
      {
        cluster: pusherCluster,
        forceTLS: true,
      }
    );

    pusherRef.current = pusher;

    pusher.connection.bind('connected', () => {
      console.log('Pusher connected');
      setConnected(true);
    });

    pusher.connection.bind('disconnected', () => {
      console.log('Pusher disconnected');
      setConnected(false);
    });

    pusher.connection.bind('error', (err) => {
      console.log('Pusher error:', err);
      setConnected(false);
    });

    const channel = pusher.subscribe('pixelboard');

    channel.bind('block_claimed', (data) => {
      console.log('Realtime block:', data);
      onBlockClaimed?.(data);
    });

    channel.bind('leaderboard_update', (data) => {
      onLeaderboard?.(data);
    });

    onCooldownMs?.(1500);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe('pixelboard');
      pusher.disconnect();
    };

  }, [user, onBlockClaimed, onLeaderboard]);

  const claimBlock = useCallback(async (cellId) => {

    if (!user) return;

    try {

      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cellId,
          user,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'claim failed');
      }

      if (data.cell) {
        onBlockClaimed?.(data.cell);
      }

      return data.cell;

    } catch (err) {
      console.error('claim failed:', err);
    }

  }, [user, onBlockClaimed]);

  return {
    connected,
    claimBlock,
  };
}
