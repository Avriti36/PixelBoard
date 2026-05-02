import { useState, useEffect, useRef } from 'react';

const COLORS = [
  '#FF6EB4','#FF4D94','#FF85B3','#FFB3D9',
  '#C77DFF','#A855F7','#F472B6','#FB7185',
  '#FBBF24','#34D399','#60A5FA','#F87171',
  '#E879F9','#A3E635','#22D3EE',
];

function Crown() {
  return (
    <span style={{ fontSize: 14 }}>👑</span>
  );
}

function CooldownBar({ cooldownMs, lastClaim }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!lastClaim) { setProgress(1); return; }
    const tick = () => {
      const pct = Math.min((Date.now() - lastClaim) / cooldownMs, 1);
      setProgress(pct);
      if (pct < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [lastClaim, cooldownMs]);

  const ready = progress >= 1;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--text-muted)', marginBottom: 5,
        fontWeight: 700,
      }}>
        <span>✨ cooldown</span>
        <span style={{ color: ready ? '#34D399' : 'var(--pink)' }}>
          {ready ? 'ready! 🌸' : 'wait...'}
        </span>
      </div>
      <div style={{
        height: 8, background: 'var(--pink-soft)', borderRadius: 99, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: ready
            ? 'linear-gradient(90deg, #34D399, #6EE7B7)'
            : 'linear-gradient(90deg, var(--pink), var(--lavender), var(--pink))',
          backgroundSize: '200% 100%',
          animation: ready ? 'none' : 'shimmer 1.5s infinite',
          borderRadius: 99,
          transition: 'width 0.1s linear, background 0.3s',
        }} />
      </div>
    </div>
  );
}

function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      background: 'var(--card)',
      backdropFilter: 'blur(12px)',
      border: `1.5px solid ${accent ? accent + '55' : 'var(--border-soft)'}`,
      borderRadius: 20,
      padding: '14px 16px',
      boxShadow: accent
        ? `var(--shadow), 0 0 0 1px ${accent}22`
        : 'var(--shadow)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

export default function Sidebar({
  user, leaderboard, onlineCount, stats,
  lastClaim, cooldownMs, onRename, onRecolor,
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    if (editingName && nameRef.current) nameRef.current.focus();
  }, [editingName]);

  if (!user) return null;

  const myRank = leaderboard.findIndex((e) => e.owner === user.id);
  const myEntry = leaderboard[myRank];

  return (
    <div style={{
      width: 248,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      overflowY: 'auto',
      maxHeight: '100%',
      paddingRight: 2,
    }}>

      {/* ── User Card ── */}
      <Card accent={user.color}>
        {/* Top gradient bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${user.color}, var(--lavender))`,
          borderRadius: '20px 20px 0 0',
        }} />

        <Label>🌸 you</Label>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: `linear-gradient(135deg, ${user.color}, ${user.color}88)`,
            border: `3px solid ${user.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#fff',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${user.color}44`,
            fontFamily: 'Fredoka One, cursive',
          }}>
            {user.name[0]}
          </div>

          {editingName ? (
            <input
              ref={nameRef}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { onRename(nameInput); setEditingName(false); }
                if (e.key === 'Escape') setEditingName(false);
              }}
              onBlur={() => { onRename(nameInput); setEditingName(false); }}
              style={{
                background: 'var(--pink-pale)',
                border: `2px solid ${user.color}66`,
                borderRadius: 10,
                color: 'var(--text)',
                padding: '5px 10px',
                fontSize: 13,
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 700,
                outline: 'none',
                flex: 1,
                boxShadow: `0 0 0 3px ${user.color}22`,
              }}
              maxLength={18}
            />
          ) : (
            <span
              onClick={() => { setNameInput(user.name); setEditingName(true); }}
              style={{
                color: 'var(--text)',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'Fredoka One, cursive',
                letterSpacing: 0.3,
              }}
              title="Click to rename ✏️"
            >
              {user.name} <span style={{ fontSize: 11, opacity: 0.5 }}>✏️</span>
            </span>
          )}
        </div>

        {/* Color picker */}
        <div style={{
          display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4,
          padding: '8px', background: 'var(--pink-pale)',
          borderRadius: 12,
        }}>
          {COLORS.map((c) => (
            <div
              key={c}
              onClick={() => onRecolor(c)}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: c, cursor: 'pointer',
                border: c === user.color ? '3px solid var(--white)' : '3px solid transparent',
                boxShadow: c === user.color ? `0 0 0 2px ${c}, 0 3px 8px ${c}66` : `0 2px 6px ${c}44`,
                transition: 'all 0.2s',
                transform: c === user.color ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {[
            { label: '🎨 tiles', value: myEntry?.count ?? 0, color: user.color },
            { label: '🏅 rank', value: myRank >= 0 ? `#${myRank + 1}` : '—', color: 'var(--lavender)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: 1, background: 'var(--pink-pale)', borderRadius: 12,
              padding: '8px 6px', textAlign: 'center',
            }}>
              <div style={{
                fontSize: 18, fontWeight: 800, color,
                fontFamily: 'Fredoka One, cursive', lineHeight: 1,
              }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontWeight: 700 }}>{label}</div>
            </div>
          ))}
        </div>

        <CooldownBar cooldownMs={cooldownMs} lastClaim={lastClaim} />
      </Card>

      {/* ── Board Stats ── */}
      <Card>
        <Label>💕 board progress</Label>

        <div style={{
          height: 10, background: 'var(--pink-soft)', borderRadius: 99, overflow: 'hidden', marginBottom: 8,
        }}>
          <div style={{
            height: '100%',
            width: `${((stats?.claimed ?? 0) / (stats?.total || 1)) * 100}%`,
            background: 'linear-gradient(90deg, var(--pink), var(--lavender))',
            borderRadius: 99,
            transition: 'width 0.6s cubic-bezier(.34,1.56,.64,1)',
          }} />
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 12, color: 'var(--text-soft)', fontWeight: 700,
        }}>
          <span>🎨 {stats?.claimed ?? 0} claimed</span>
          <span style={{ color: 'var(--pink)', fontWeight: 800 }}>{stats?.percent ?? 0}%</span>
          <span>✨ {stats?.unclaimed ?? 0} free</span>
        </div>
      </Card>

      {/* ── Leaderboard ── */}
      <Card style={{ flex: 1 }}>
        <Label><Crown /> leaderboard</Label>

        {leaderboard.length === 0 && (
          <div style={{
            fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
            padding: '24px 0', fontWeight: 700,
            animation: 'float 3s ease-in-out infinite',
          }}>
            🌸 no claims yet<br />
            <span style={{ fontSize: 11, opacity: 0.6 }}>be the first!</span>
          </div>
        )}

        {leaderboard.map((entry, i) => {
          const isMe = entry.owner === user.id;
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div
              key={entry.owner}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', marginBottom: 4,
                borderRadius: 12,
                background: isMe
                  ? `linear-gradient(135deg, ${user.color}18, var(--lav-soft))`
                  : i === 0 ? 'linear-gradient(135deg, #FFF8E1, #FFF3CD)' : 'var(--pink-pale)',
                border: isMe ? `1.5px solid ${user.color}44` : '1.5px solid var(--border-soft)',
                transition: 'all 0.2s',
                animation: 'fadeUp 0.3s ease both',
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <div style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>
                {medals[i] ?? <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800 }}>{i + 1}</span>}
              </div>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: entry.color,
                boxShadow: `0 2px 6px ${entry.color}66`,
                flexShrink: 0,
              }} />
              <div style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: 12, fontWeight: 800,
                color: isMe ? entry.color : 'var(--text)',
              }}>
                {entry.ownerName}{isMe ? ' ✨' : ''}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 800, color: entry.color,
                fontFamily: 'Fredoka One, cursive',
              }}>
                {entry.count}
              </div>
            </div>
          );
        })}
      </Card>

      {/* ── Online ── */}
      <Card style={{ padding: '10px 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#34D399',
              boxShadow: '0 0 8px #34D399',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 700 }}>
              friends online 💚
            </span>
          </div>
          <span style={{
            fontSize: 16, color: '#34D399', fontWeight: 800,
            fontFamily: 'Fredoka One, cursive',
          }}>
            {onlineCount}
          </span>
        </div>
      </Card>
    </div>
  );
}