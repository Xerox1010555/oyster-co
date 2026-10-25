'use client';

import { useEffect, useRef } from 'react';
import { useApp } from './provider';

/**
 * Fixed 3D stage. Mounts once in the shared layout; the engine targets
 * whichever stage container is on screen (#hero / #story / #collection /
 * #configurator / #pd-stage / .stage-col).
 */
export default function WatchStage() {
  const { config } = useApp();
  const engineRef = useRef<any>(null);
  const configRef = useRef(config);
  const prevRef = useRef(config);

  useEffect(() => { configRef.current = config; }, [config]);

  useEffect(() => {
    let disposed = false;
    let engine: any = null;
    (async () => {
      try {
        const { createEngine } = await import('@/lib/watch3d');
        if (disposed) return;
        engine = createEngine(document.getElementById('webgl') as HTMLCanvasElement, () => configRef.current);
        engineRef.current = engine;
        engine.start();
        // Story exploded-view choreography (home page only — guards internal)
        engine.buildStoryTimeline();
      } catch (error) {
        console.warn('Watch engine unavailable', error);
        document.documentElement.classList.add('no-webgl');
      }
    })();
    return () => { disposed = true; engine?.dispose?.(); engineRef.current = null; };
  }, []);

  /* Config changes → config-swap (no rebuild) or full rebuild on model change */
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine?.ready) { prevRef.current = config; return; }
    const prev = prevRef.current;
    if (!prev) { prevRef.current = config; return; }
    try {
      if (prev.model !== config.model) engine.rebuild();
      else if (prev.dial !== config.dial) engine.applyConfig('dial', config);
      else if (prev.bezel !== config.bezel) engine.applyConfig('bezel', config);
      else if (prev.bracelet !== config.bracelet) engine.applyConfig('bracelet', config);
    } catch { /* engine guards itself */ }
    prevRef.current = config;
  }, [config]);

  return (
    <>
      <canvas id="webgl" aria-hidden="true" />
      <div id="webgl-fallback" aria-hidden="true">
        <div
          style={{
            width: 'min(46vh,44vw)', aspectRatio: '1', borderRadius: '50%',
            background: 'radial-gradient(circle at 36% 30%, #2a2d31, #101214 62%, #050505 100%)',
            boxShadow: '0 24px 90px -30px rgba(201,169,97,.4), inset 0 0 0 2px rgba(201,169,97,.35)',
          }}
        />
      </div>
    </>
  );
}
