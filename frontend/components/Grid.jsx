import { memo, useCallback, useRef, useState, useEffect } from 'react';

const Cell = memo(function Cell({ cell, isOwn, zoom }) {
  const [flash, setFlash] = useState(false);
  const prevAt = useRef(cell.claimedAt);

  useEffect(() => {
    if (cell.claimedAt && cell.claimedAt !== prevAt.current) {
      prevAt.current = cell.claimedAt;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
  }, [cell.claimedAt]);

  const isClaimed = !!cell.color;
  const bg = isClaimed ? cell.color : '#FFF0F7';
  const border = isClaimed ? `1px solid ${cell.color}88` : '1px solid #F5C6DF';

  return (
    <div
      data-cell-id={cell.id}
      title={cell.ownerName ? `@${cell.ownerName}` : '✨ unclaimed'}
      style={{
        width: zoom,
        height: zoom,
        backgroundColor: bg,
        border,
        borderRadius: zoom > 12 ? 3 : 1,
        cursor: 'crosshair',
        boxSizing: 'border-box',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.3s ease',
        transform: flash ? 'scale(1.5)' : isOwn ? 'scale(1.05)' : 'scale(1)',
        zIndex: flash ? 5 : isOwn ? 2 : 1,
        position: 'relative',
        boxShadow: flash
          ? `0 0 16px 5px ${cell.color}cc, 0 0 32px 8px ${cell.color}55`
          : isOwn
          ? `0 0 8px 2px ${cell.color}88`
          : 'none',
      }}
    />
  );
});

function Tooltip({ cell, pos, visible }) {
  if (!visible || !cell?.ownerName) return null;
  return (
    <div style={{
      position: 'fixed',
      left: pos.x + 14,
      top: pos.y - 40,
      background: 'rgba(255,255,255,0.95)',
      border: `2px solid ${cell.color}66`,
      borderRadius: 12,
      padding: '5px 12px',
      color: cell.color,
      fontFamily: 'Fredoka One, cursive',
      fontSize: 13,
      letterSpacing: 0.5,
      pointerEvents: 'none',
      zIndex: 1000,
      whiteSpace: 'nowrap',
      backdropFilter: 'blur(8px)',
      boxShadow: `0 4px 20px ${cell.color}33`,
    }}>
      @{cell.ownerName} 🌸
    </div>
  );
}

export default function Grid({ cells, cols, rows, userId, onClaim, zoom }) {
  const [tooltip, setTooltip] = useState({ visible: false, cell: null, pos: { x: 0, y: 0 } });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const didPan = useRef(false);
  const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const handleClick = useCallback((e) => {
    if (didPan.current) { didPan.current = false; return; }
    const cellId = e.target.dataset?.cellId;
    if (cellId !== undefined) onClaim(Number(cellId));
  }, [onClaim]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning.current) {
      const dx = e.clientX - panStart.current.mx;
      const dy = e.clientY - panStart.current.my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan.current = true;
      setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy });
      return;
    }
    const cellId = e.target.dataset?.cellId;
    if (cellId !== undefined) {
      const cell = cells[+cellId];
      if (cell?.ownerName) {
        setTooltip({ visible: true, cell, pos: { x: e.clientX, y: e.clientY } });
        return;
      }
    }
    setTooltip((t) => (t.visible ? { ...t, visible: false } : t));
  }, [cells]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || e.altKey) {
      e.preventDefault();
      isPanning.current = true;
      didPan.current = false;
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    }
  }, [pan]);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const handleWheel = useCallback((e) => {
    if (e.shiftKey) {
      e.preventDefault();
      setPan((p) => ({ x: p.x - e.deltaY, y: p.y }));
    } else if (!e.ctrlKey) {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #FFF0F7 0%, #FAE8FF 50%, #FFF0F7 100%)',
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Soft dot-grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, #FFB3D955 1.5px, transparent 1.5px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }} />

      {/* Floating blobs for depth */}
      {[
        { w: 300, h: 300, top: '10%', left: '5%',  color: '#FF6EB422' },
        { w: 200, h: 200, top: '60%', left: '70%', color: '#C9B8FF33' },
        { w: 150, h: 150, top: '5%',  left: '60%', color: '#FFB3D922' },
      ].map((b, i) => (
        <div key={i} style={{
          position: 'absolute', top: b.top, left: b.left,
          width: b.w, height: b.h, borderRadius: '50%',
          background: b.color, filter: 'blur(40px)',
          pointerEvents: 'none',
          animation: `float ${4 + i}s ease-in-out infinite`,
          animationDelay: `${i * 0.8}s`,
        }} />
      ))}

      {/* Pixel grid */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${zoom}px)`,
        gridTemplateRows: `repeat(${rows}, ${zoom}px)`,
        gap: 1,
        padding: 14,
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(8px)',
        borderRadius: 16,
        border: '2px solid rgba(255,182,217,0.5)',
        boxShadow: '0 8px 40px rgba(255,110,180,0.15), 0 0 0 1px rgba(255,182,217,0.3)',
        userSelect: 'none',
      }}>
        {cells.map((cell) => (
          <Cell
            key={cell.id}
            cell={cell}
            isOwn={cell.owner === userId}
            zoom={zoom}
          />
        ))}
      </div>

      <Tooltip visible={tooltip.visible} cell={tooltip.cell} pos={tooltip.pos} />
    </div>
  );
}