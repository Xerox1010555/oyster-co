'use client';

import { useEffect, useRef } from 'react';

/** Custom cursor ring + dot (fine pointers only). Port of the v1 cursor. */
export default function Cursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const root = rootRef.current;
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!root || !ring || !dot) return;
    document.body.classList.add('has-cursor');

    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const ringPos = { ...pos };
    let raf = 0;
    let live = true;

    const onMove = (event: PointerEvent | MouseEvent) => {
      pos.x = event.clientX; pos.y = event.clientY;
      dot.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-50%)`;
    };
    const onHover = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Element | null;
      const interactive = target?.closest?.('a,button,select,input,textarea,.card,.swatch,.opt');
      root.classList.toggle('hover', !!interactive);
    };
    const loop = () => {
      if (!live) return;
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;
      ring.style.transform = `translate(${ringPos.x}px,${ringPos.y}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('mousemove', onHover, { passive: true });

    return () => {
      live = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('mousemove', onHover);
      document.body.classList.remove('has-cursor');
    };
  }, []);

  return (
    <div id="cursor" ref={rootRef} aria-hidden="true">
      <div className="c-ring" ref={ringRef} />
      <div className="c-dot" ref={dotRef} />
    </div>
  );
}
