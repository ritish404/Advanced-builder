import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export function useFPSCounter() {
  const setFps = useStore(state => state.setFps);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animationFrameId: number;

    const loop = (currentTime: number) => {
      frameCount.current++;
      const delta = currentTime - lastTime.current;

      if (delta >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / delta));
        frameCount.current = 0;
        lastTime.current = currentTime;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [setFps]);
}
