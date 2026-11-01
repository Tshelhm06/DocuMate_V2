import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Runs `loader` every time the screen comes into focus (so lists refresh after
 * adding / editing something on another screen).
 */
export default function useLoad(loader, deps = []) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    try {
      await loader();
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (alive) await run();
      })();
      return () => {
        alive = false;
      };
    }, [run])
  );

  return { loading, error, reload: run };
}
