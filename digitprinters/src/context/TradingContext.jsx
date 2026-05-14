/**
 * Trading Context
 * Manages trading state, open contracts, and market data
 */

import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const TradingContext = createContext(null);

export const TradingProvider = ({ children }) => {
  const { deriv } = useAuth();
  const [balance, setBalance] = useState(0);
  const [openContracts, setOpenContracts] = useState([]);
  const [marketData, setMarketData] = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState('R_25');
  const [selectedTimeframe, setSelectedTimeframe] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const SYNTHETIC_INDICES = [
    { code: 'R_10', name: 'Volatility 10', multiplier: 10 },
    { code: 'R_25', name: 'Volatility 25', multiplier: 25 },
    { code: 'R_50', name: 'Volatility 50', multiplier: 50 },
    { code: 'R_75', name: 'Volatility 75', multiplier: 75 },
    { code: 'R_100', name: 'Volatility 100', multiplier: 100 },
  ];

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!deriv || !deriv.isConnected()) return;

    try {
      const response = await deriv.send({ balance: 1 });
      if (response.balance) {
        setBalance(response.balance.balance);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  }, [deriv]);

  // Subscribe to balance updates
  useEffect(() => {
    if (!deriv || !deriv.isConnected()) return;

    const unsubscribe = deriv.on('message', (data) => {
      if (data.balance) {
        setBalance(data.balance.balance);
      }
    });

    return unsubscribe;
  }, [deriv]);

  // Subscribe to ticks for selected symbol
  useEffect(() => {
    if (!deriv || !deriv.isConnected()) return;

    deriv.subscribeTicks(selectedSymbol, (tick) => {
      setMarketData((prev) => ({
        ...prev,
        [selectedSymbol]: {
          ...prev[selectedSymbol],
          lastTick: tick,
          bid: tick.bid,
          ask: tick.ask,
          bid_display: tick.bid_display,
          ask_display: tick.ask_display,
          timestamp: tick.epoch * 1000,
        },
      }));
    });
  }, [deriv, selectedSymbol]);

  const placeTrade = useCallback(
    async (proposal) => {
      if (!deriv) {
        setError('Deriv not connected');
        return;
      }

      try {
        setLoading(true);
        const response = await deriv.send({
          proposal: 1,
          ...proposal,
        });
        return response;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [deriv]
  );

  const buyContract = useCallback(
    async (contractId, price) => {
      if (!deriv) {
        setError('Deriv not connected');
        return;
      }

      try {
        setLoading(true);
        const response = await deriv.send({
          buy: contractId,
          price: price,
        });
        // Refresh balance and contracts
        await fetchBalance();
        return response;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [deriv, fetchBalance]
  );

  const getActiveSymbols = useCallback(async () => {
    if (!deriv) return [];

    try {
      const response = await deriv.send({
        active_symbols: 'brief',
        product_type: 'synthetic_index',
      });
      return response.active_symbols || [];
    } catch (err) {
      console.error('Error getting active symbols:', err);
      return [];
    }
  }, [deriv]);

  return (
    <TradingContext.Provider
      value={{
        balance,
        openContracts,
        marketData,
        selectedSymbol,
        selectedTimeframe,
        loading,
        error,
        SYNTHETIC_INDICES,
        setSelectedSymbol,
        setSelectedTimeframe,
        fetchBalance,
        placeTrade,
        buyContract,
        getActiveSymbols,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within TradingProvider');
  }
  return context;
};
