import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const getQuote = (tick) => tick?.quote ?? tick?.bid ?? tick?.ask ?? null;

export function useTicks(symbol) {
  const { deriv } = useAuth();
  const [tick, setTick] = useState(null);
  const [direction, setDirection] = useState('flat');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol || !deriv || !deriv.isConnected()) {
      setTick(null);
      setDirection('flat');
      return;
    }

    let lastPrice = null;
    let unsubscribe;

    const subscribe = async () => {
      try {
        unsubscribe = await deriv.subscribeTicks(symbol, (nextTick) => {
          const price = getQuote(nextTick);
          setTick(nextTick);
          setDirection((currentDirection) => {
            if (lastPrice === null || price === null) return 'flat';
            if (price > lastPrice) return 'up';
            if (price < lastPrice) return 'down';
            return currentDirection;
          });
          lastPrice = price;
        });
      } catch (err) {
        setError(err.message || 'Tick subscription failed');
      }
    };

    subscribe();

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [symbol, deriv]);

  return {
    tick,
    price: getQuote(tick),
    direction,
    error,
    isLive: Boolean(tick),
  };
}
