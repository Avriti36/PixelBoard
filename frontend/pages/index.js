import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useUser } from '../hooks/useUser';
import { usePusher } from '../hooks/usePusher';
import Sidebar from '../components/Sidebar';

const Grid = dynamic(() => import('../components/Grid'), { ssr: false });

function FeedItem({ item }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', animation: 'fadeUp 0.3s ease' }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, boxShadow: `0 2px 6px ${item.color}66`, flexShrink: 0 }} />
      <span style={{ color: item.color, fontSize: 11, fontWeight: 800 }}>{item.ownerName}</span>
      <span style={{ color: 'var(--text-soft)', fontSize: 11, fontWeight: 600 }}>claimed #{item.cellId} 🎨</span>
    </div>
  );
}

function ZoomControls({ zoom, onZoom }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'fixed', bottom: 24, right: 272, zIndex: 100 }}>
      {[['+', 1], ['−', -1], ['⌂', 0]].map(([label, delta]) => (
        <button key={label} onClick={() => onZoom(delta)}
          style={{ width: 36, height: 36, border: '2px solid var(--border)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', color: 'var(--pink)', borderRadius: 12, cursor: 'pointer', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)', transition: 'all 0.15s', fontFamily: 'Fredoka One, cursive' }}
          onMouseEnter={(e) => { e.target.style.background = 'var(--pink)'; e.target.style.color = '#fff'; e.target.style.transform = 'scale(1.1)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.85)'; e.target.style.color = 'var(--pink)'; e.target.style.transform = 'scale(1)'; }}
        >{label}</button>
      ))}
      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', fontWeight: 800 }}>{zoom}px</div>
    </div>
  );
}

export default function Home() {
  const { user, rename, recolor } = useUser();

  const [cells, setCells] = useState([]);
  const [cols, setCols] = useState(50);
  const [rows, setRows] = useState(35);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(18);
  const [leaderboard, setLeaderboard] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, claimed: 0, unclaimed: 0, percent: 0 });
  const [lastClaim, setLastClaim] = useState(null);
  const [cooldownMs, setCooldownMs] = useState(1500);
  const [feed, setFeed] = useState([]);
  const claimedCellIds = useRef(new Set());

  useEffect(() => {
    fetch('/api/grid')
      .then((r) => r.json())
      .then(({ cells: data, cols: c, rows: r, cooldownMs: cd }) => {
        const sortedCells = data.sort((a, b) => a.id - b.id);
        claimedCellIds.current = new Set(sortedCells.filter((cell) => cell.color).map((cell) => cell.id));
        setCells(sortedCells);
        setCols(c); setRows(r);
        if (cd) setCooldownMs(cd);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/stats').then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  const handleBlockClaimed = useCallback(({ cellId, owner, ownerName, color, claimedAt }) => {
    const wasUnclaimed = !claimedCellIds.current.has(cellId);
    claimedCellIds.current.add(cellId);

    setCells((prev) => {
      const next = prev.map((cell) => {
        if (cell.id !== cellId) return cell;
        return { ...cell, owner, ownerName, color, claimedAt };
      });
      return next;
    });
    setStats((prev) => {
      if (!wasUnclaimed) return prev;
      const claimed = (prev.claimed || 0) + 1;
      const total = prev.total || 1750;
      return { ...prev, claimed, unclaimed: total - claimed, percent: ((claimed / total) * 100).toFixed(1) };
    });
    setFeed((prev) => [{ cellId, ownerName, color, id: Date.now() }, ...prev].slice(0, 6));
  }, []);

  const { connected: socketConnected, claimBlock } = usePusher({
    user,
    onBlockClaimed: handleBlockClaimed,
    onLeaderboard: setLeaderboard,
    onOnlineCount: setOnlineCount,
    onCooldownMs: setCooldownMs,
  });

  const handleClaim = useCallback((cellId) => {
    if (!user) return;
    const now = Date.now();
    if (lastClaim && now - lastClaim < cooldownMs) return;
    claimBlock(cellId);
    setLastClaim(now);
  }, [user, lastClaim, cooldownMs, claimBlock]);

  const handleZoom = useCallback((delta) => {
    setZoom((z) => delta === 0 ? 18 : Math.max(6, Math.min(32, z + delta * 3)));
  }, []);

  useEffect(() => {
    const onWheel = (e) => { if (e.ctrlKey) { e.preventDefault(); handleZoom(e.deltaY < 0 ? 1 : -1); } };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [handleZoom]);

  return (
    <>
      <Head>
        <title>PixelBoard 🌸 Claim Your Turf</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '2px solid var(--border-soft)', flexShrink: 0, zIndex: 10, boxShadow: '0 2px 20px rgba(255,110,180,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--pink), var(--lavender))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 4px 12px rgba(255,110,180,0.35)' }}>🌸</div>
            <h1 style={{ fontFamily: 'Fredoka One, cursive', fontSize: 22, background: 'linear-gradient(90deg, var(--pink), var(--lavender))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 1 }}>PixelBoard</h1>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--pink-pale)', border: '1.5px solid var(--border)', padding: '2px 8px', borderRadius: 99, fontWeight: 800 }}>{cols}×{rows} ✨</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 14, fontWeight: 700 }}>
            <span>🖱️ click to claim</span>
            <span>🔍 ctrl+scroll zoom</span>
            <span>✋ alt+drag pan</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: socketConnected ? '#E8FFF4' : '#FFF0F0', border: `1.5px solid ${socketConnected ? '#34D39966' : '#FF6B6B66'}`, borderRadius: 99, fontSize: 12, fontWeight: 800, color: socketConnected ? '#059669' : '#DC2626' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: socketConnected ? '#34D399' : '#FF6B6B', boxShadow: socketConnected ? '0 0 8px #34D399' : 'none', animation: socketConnected ? 'pulse 2s infinite' : 'none' }} />
            {socketConnected ? '🌸 live' : '⏳ connecting…'}
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 12, padding: 12 }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
            {loading ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: 'var(--bg)' }}>
                <div style={{ fontSize: 40, animation: 'float 1.5s ease-in-out infinite' }}>🌸</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 800, fontFamily: 'Fredoka One, cursive', letterSpacing: 1 }}>loading your canvas...</div>
              </div>
            ) : (
              <Grid cells={cells} cols={cols} rows={rows} userId={user?.id} onClaim={handleClaim} zoom={zoom} />
            )}
            {feed.length > 0 && (
              <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(12px)', border: '1.5px solid var(--border-soft)', borderRadius: 16, padding: '10px 14px', minWidth: 220, boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>✨ activity</div>
                {feed.map((item) => <FeedItem key={item.id} item={item} />)}
              </div>
            )}
          </div>

          <Sidebar user={user} leaderboard={leaderboard} onlineCount={onlineCount} stats={stats} lastClaim={lastClaim} cooldownMs={cooldownMs} onRename={rename} onRecolor={recolor} />
        </div>

        <ZoomControls zoom={zoom} onZoom={handleZoom} />
      </div>
    </>
  );
}
