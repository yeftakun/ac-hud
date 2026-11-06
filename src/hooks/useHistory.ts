import { useCallback, useRef, useState } from "react";

export const MAX_HISTORY = 100;

type StateUpdater<T> = T | ((current: T) => T);

function resolve<T>(updater: StateUpdater<T>, current: T): T {
  return typeof updater === "function" ? (updater as (value: T) => T)(current) : updater;
}

export function useHistory<T>(initial: T) {
  const [history, setHistory] = useState({ past: [] as T[], present: initial, future: [] as T[] });
  const transactionBase = useRef<T | null>(null);

  const set = useCallback((updater: StateUpdater<T>) => {
    setHistory((current) => {
      const next = resolve(updater, current.present);
      if (Object.is(next, current.present)) return current;
      return {
        past: [...current.past, current.present].slice(-MAX_HISTORY),
        present: next,
        future: [],
      };
    });
  }, []);

  const replace = useCallback((next: T) => {
    transactionBase.current = null;
    setHistory({ past: [], present: next, future: [] });
  }, []);

  const beginTransaction = useCallback(() => {
    setHistory((current) => {
      transactionBase.current = current.present;
      return current;
    });
  }, []);

  const setTransient = useCallback((updater: StateUpdater<T>) => {
    setHistory((current) => ({ ...current, present: resolve(updater, current.present) }));
  }, []);

  const commitTransaction = useCallback(() => {
    const base = transactionBase.current;
    transactionBase.current = null;
    if (base === null) return;
    setHistory((current) => ({
      past: [...current.past, base].slice(-MAX_HISTORY),
      present: current.present,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    transactionBase.current = null;
    setHistory((current) => {
      if (current.past.length === 0) return current;
      const previous = current.past[current.past.length - 1];
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    transactionBase.current = null;
    setHistory((current) => {
      if (current.future.length === 0) return current;
      const next = current.future[0];
      return {
        past: [...current.past, current.present].slice(-MAX_HISTORY),
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  return {
    present: history.present,
    set,
    replace,
    beginTransaction,
    setTransient,
    commitTransaction,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
